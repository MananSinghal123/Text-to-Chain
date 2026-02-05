import { Token, Ether, Percent } from "@uniswap/sdk-core";
import { Pool, Position, V4PositionManager } from "@uniswap/v4-sdk";
import { nearestUsableTick } from "@uniswap/v3-sdk";
import { CONFIG } from "./config/constants";
import {
  ERC20_ABI,
  POSITION_MANAGER_ABI,
  STATE_VIEW_ABI,
} from "./config/contracts";
import { EXPLORERS } from "./config/addresses";
import {
  account,
  publicClient,
  walletClient,
  getDeadline,
  parseTokenAmount,
  formatTokenAmount,
} from "./utils/helpers";

async function main() {
  console.log("🚀 Starting Uniswap v4 Pool Creation...");
  console.log("Account:", account.address);

  // Step 1: Define tokens
  console.log("\n📝 Step 1: Defining tokens...");

  const ETH_NATIVE = Ether.onChain(CONFIG.CHAIN_ID);

  const YOUR_TOKEN = new Token(
    CONFIG.CHAIN_ID,
    CONFIG.YOUR_TOKEN_ADDRESS,
    CONFIG.YOUR_TOKEN_DECIMALS,
    CONFIG.YOUR_TOKEN_SYMBOL,
    CONFIG.YOUR_TOKEN_NAME,
  );

  // ETH wrapper token for SDK
  const ETH_TOKEN = new Token(
    CONFIG.CHAIN_ID,
    "0x0000000000000000000000000000000000000000",
    18,
    "ETH",
    "Ether",
  );

  // Determine token order
  const token0 =
    YOUR_TOKEN.address.toLowerCase() < ETH_TOKEN.address.toLowerCase()
      ? YOUR_TOKEN
      : ETH_TOKEN;
  const token1 = token0 === YOUR_TOKEN ? ETH_TOKEN : YOUR_TOKEN;

  console.log(`Token0: ${token0.symbol} (${token0.address})`);
  console.log(`Token1: ${token1.symbol} (${token1.address})`);

  // Step 2: Check balances
  console.log("\n💰 Step 2: Checking balances...");

  const ethBalance = await publicClient.getBalance({
    address: account.address,
  });
  console.log(`ETH Balance: ${formatTokenAmount(ethBalance, 18)} ETH`);

  if (!YOUR_TOKEN.isNative) {
    const tokenBalance = await publicClient.readContract({
      address: CONFIG.YOUR_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account.address],
    });
    console.log(
      `${YOUR_TOKEN.symbol} Balance: ${formatTokenAmount(tokenBalance, YOUR_TOKEN.decimals)}`,
    );
  }

  // Step 3: Define liquidity amounts
  console.log("\n💧 Step 3: Defining liquidity amounts...");

  const ethAmount = "0.01"; // 0.01 ETH
  const tokenAmount = "10"; // 10 tokens

  const ethAmountParsed = parseTokenAmount(ethAmount, 18);
  const tokenAmountParsed = parseTokenAmount(tokenAmount, YOUR_TOKEN.decimals);

  const amount0 = token0 === YOUR_TOKEN ? tokenAmountParsed : ethAmountParsed;
  const amount1 = token1 === YOUR_TOKEN ? tokenAmountParsed : ethAmountParsed;

  console.log(
    `Amount0 (${token0.symbol}): ${formatTokenAmount(amount0, token0.decimals)}`,
  );
  console.log(
    `Amount1 (${token1.symbol}): ${formatTokenAmount(amount1, token1.decimals)}`,
  );

  // Step 4: Approve tokens
  console.log("\n✅ Step 4: Approving tokens...");

  if (!YOUR_TOKEN.isNative) {
    const approveTx = await walletClient.writeContract({
      address: CONFIG.YOUR_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONFIG.PERMIT2_ADDRESS, tokenAmountParsed * 2n], // Approve extra for safety
    });

    console.log("Approve transaction:", approveTx);
    await publicClient.waitForTransactionReceipt({ hash: approveTx });
    console.log("✓ Tokens approved");
  }

  // Step 5: Calculate initial price (sqrtPriceX96)
  console.log("\n💱 Step 5: Calculating initial price...");

  // Calculate price ratio: price = amount1 / amount0
  const priceRatio = Number(amount1) / Number(amount0);
  const sqrtPrice = Math.sqrt(priceRatio);
  const sqrtPriceX96 = BigInt(Math.floor(sqrtPrice * 2 ** 96));

  console.log(`Price Ratio: ${priceRatio.toFixed(6)}`);
  console.log(`sqrtPriceX96: ${sqrtPriceX96.toString()}`);

  // Step 6: Check if pool exists
  console.log("\n🏊 Step 6: Checking pool status...");

  const poolId = Pool.getPoolId(
    token0,
    token1,
    CONFIG.POOL_FEE,
    CONFIG.TICK_SPACING,
    CONFIG.HOOK_ADDRESS,
  );

  console.log(`Pool ID: ${poolId}`);

  let poolExists = false;
  let currentTick = 0;
  let currentLiquidity = 0n;
  let currentSqrtPriceX96 = sqrtPriceX96;

  try {
    const [slot0, liquidity] = await Promise.all([
      publicClient.readContract({
        address: CONFIG.STATE_VIEW_ADDRESS,
        abi: STATE_VIEW_ABI,
        functionName: "getSlot0",
        args: [poolId as `0x${string}`],
      }),
      publicClient.readContract({
        address: CONFIG.STATE_VIEW_ADDRESS,
        abi: STATE_VIEW_ABI,
        functionName: "getLiquidity",
        args: [poolId as `0x${string}`],
      }),
    ]);

    currentSqrtPriceX96 = slot0[0] as bigint;
    currentTick = slot0[1] as number;
    currentLiquidity = liquidity as bigint;

    if (currentSqrtPriceX96 > 0n) {
      poolExists = true;
      console.log("✓ Pool already exists!");
      console.log(`  Current sqrtPriceX96: ${currentSqrtPriceX96}`);
      console.log(`  Current Tick: ${currentTick}`);
      console.log(`  Current Liquidity: ${currentLiquidity}`);
    }
  } catch (error) {
    console.log("✓ Pool does not exist - will create new pool");
  }

  // Step 7: Create Pool instance
  console.log("\n🎯 Step 7: Creating Pool instance...");

  const pool = new Pool(
    token0,
    token1,
    CONFIG.POOL_FEE,
    CONFIG.TICK_SPACING,
    CONFIG.HOOK_ADDRESS,
    currentSqrtPriceX96.toString(),
    currentLiquidity.toString(),
    poolExists ? currentTick : 0,
  );

  // Step 8: Define position parameters
  console.log("\n📊 Step 8: Defining position parameters...");

  let tickLower: number;
  let tickUpper: number;

  if (CONFIG.FULL_RANGE_POSITION) {
    console.log("Position Type: Full Range");
    const MIN_TICK = -887272;
    const MAX_TICK = 887272;
    tickLower = nearestUsableTick(MIN_TICK, CONFIG.TICK_SPACING);
    tickUpper = nearestUsableTick(MAX_TICK, CONFIG.TICK_SPACING);
  } else {
    console.log("Position Type: Concentrated Range");
    const centerTick = poolExists ? currentTick : 0;
    tickLower = nearestUsableTick(
      centerTick - CONFIG.TICK_RANGE,
      CONFIG.TICK_SPACING,
    );
    tickUpper = nearestUsableTick(
      centerTick + CONFIG.TICK_RANGE,
      CONFIG.TICK_SPACING,
    );
  }

  console.log(`Tick Lower: ${tickLower}`);
  console.log(`Tick Upper: ${tickUpper}`);

  // Step 9: Create Position
  console.log("\n🎯 Step 9: Creating Position...");

  const position = Position.fromAmounts({
    pool,
    tickLower,
    tickUpper,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    useFullPrecision: true,
  });

  console.log("Position Details:");
  console.log(`  Liquidity: ${position.liquidity.toString()}`);
  console.log(
    `  Token0 Amount: ${position.amount0.toExact()} ${token0.symbol}`,
  );
  console.log(
    `  Token1 Amount: ${position.amount1.toExact()} ${token1.symbol}`,
  );

  // Step 10: Prepare Mint Options
  console.log("\n⚙️  Step 10: Preparing Mint Options...");

  const deadline = await getDeadline(CONFIG.DEADLINE_MINUTES);
  const slippageTolerance = new Percent(
    Math.floor(CONFIG.SLIPPAGE_TOLERANCE * 100),
    10000,
  );

  const mintOptions = {
    recipient: account.address,
    slippageTolerance,
    deadline: deadline.toString(),
    useNative: ETH_NATIVE,
    createPool: !poolExists,
    sqrtPriceX96: poolExists ? undefined : sqrtPriceX96.toString(),
    hookData: "0x",
  };

  console.log("Mint Options:");
  console.log(`  Recipient: ${mintOptions.recipient}`);
  console.log(`  Slippage Tolerance: ${CONFIG.SLIPPAGE_TOLERANCE}%`);
  console.log(`  Deadline: ${new Date(Number(deadline) * 1000).toISOString()}`);
  console.log(`  Create Pool: ${mintOptions.createPool}`);
  console.log(`  Use Native ETH: true`);

  // Step 11: Generate Transaction Calldata
  console.log("\n🔧 Step 11: Generating Transaction Calldata...");

  const { calldata, value } = V4PositionManager.addCallParameters(
    position,
    mintOptions,
  );

  console.log("Transaction Data:");
  console.log(`  Calldata Length: ${calldata.length} bytes`);
  console.log(`  ETH Value: ${formatTokenAmount(BigInt(value), 18)} ETH`);

  // Step 12: Execute Transaction
  console.log("\n🚀 Step 12: Executing Transaction...");
  console.log("Sending transaction...");

  const txHash = await walletClient.writeContract({
    address: CONFIG.POSITION_MANAGER_ADDRESS,
    abi: POSITION_MANAGER_ABI,
    functionName: "multicall",
    args: [[calldata]],
    value: BigInt(value),
  });

  console.log(`\n✅ Transaction submitted!`);
  console.log(`TX Hash: ${txHash}`);
  console.log(`Explorer: ${EXPLORERS[CONFIG.CHAIN_ID]}/tx/${txHash}`);
  console.log("\nWaiting for confirmation...");

  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
  });

  console.log(`\n✅ Transaction confirmed in block ${receipt.blockNumber}`);
  console.log(`Gas Used: ${receipt.gasUsed.toString()}`);

  // Success Summary
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║                    🎉 SUCCESS! 🎉                      ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  console.log("Pool Details:");
  console.log(`  Token0: ${token0.symbol} (${token0.address})`);
  console.log(`  Token1: ${token1.symbol} (${token1.address})`);
  console.log(`  Fee Tier: ${CONFIG.POOL_FEE / 10000}%`);
  console.log(`  Pool ID: ${poolId}`);

  console.log("\nPosition Details:");
  console.log(`  Liquidity: ${position.liquidity.toString()}`);
  console.log(`  ${token0.symbol} Amount: ${position.amount0.toExact()}`);
  console.log(`  ${token1.symbol} Amount: ${position.amount1.toExact()}`);
  console.log(`  Tick Range: [${tickLower}, ${tickUpper}]`);

  console.log(
    `\n🔗 View on Explorer: ${EXPLORERS[CONFIG.CHAIN_ID]}/tx/${txHash}`,
  );
  console.log("\n✅ Your pool is now live and ready for swaps!");
}

// Run the main function
main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:", error.stack);
    }
    process.exit(1);
  });

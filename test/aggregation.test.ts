import { Trade, Aggregation, ChainId, Pair, Token, TokenAmount, Price, TradeType, Fraction } from '../src'
import JSBI from 'jsbi'

describe('Aggregation', () => {
  const token0 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000001', 18, 't0')
  const token1 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000002', 18, 't1')
  const token2 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000003', 18, 't2')
  const token3 = new Token(ChainId.MAINNET, '0x0000000000000000000000000000000000000004', 18, 't3')

  const pair_0_1 = new Pair(new TokenAmount(token0, JSBI.BigInt(1000)), new TokenAmount(token1, JSBI.BigInt(1000)))
  const pair_0_2 = new Pair(new TokenAmount(token0, JSBI.BigInt(1000)), new TokenAmount(token2, JSBI.BigInt(1100)))
  const pair_0_3 = new Pair(new TokenAmount(token0, JSBI.BigInt(1000)), new TokenAmount(token3, JSBI.BigInt(900)))
  const pair_1_2 = new Pair(new TokenAmount(token1, JSBI.BigInt(1200)), new TokenAmount(token2, JSBI.BigInt(1000)))
  const pair_1_3 = new Pair(new TokenAmount(token1, JSBI.BigInt(1200)), new TokenAmount(token3, JSBI.BigInt(1300)))
  const pair_2_3 = new Pair(new TokenAmount(token2, JSBI.BigInt(900)), new TokenAmount(token3, JSBI.BigInt(1300)))
  const all_pairs = [pair_0_1, pair_0_2, pair_0_3, pair_1_2, pair_1_3, pair_2_3]

  it('throws on empty trades', () => {
    expect(() => new Aggregation([])).toThrow('TRADES_LENGTH')
  })

  it('throws if input tokens do not match', () => {
    const trades_0_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 1
    })
    const trades_2_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token2, JSBI.BigInt(100)), token1, {
      maxNumResults: 1
    })
    expect(() => new Aggregation([...trades_0_1, ...trades_2_1])).toThrow('TRADES_INPUT_TOKEN')
  })

  it('throws if output tokens do not match', () => {
    const trades_0_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 1
    })
    const trades_0_2 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2, {
      maxNumResults: 1
    })
    expect(() => new Aggregation([...trades_0_1, ...trades_0_2])).toThrow('TRADES_OUTPUT_TOKEN')
  })

  it('throws if trade type do not match', () => {
    const trades_0_1_exact_in = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 1
    })
    const trades_0_1_exact_out = Trade.bestTradeExactOut(all_pairs, token0, new TokenAmount(token1, JSBI.BigInt(100)), {
      maxNumResults: 1
    })
    expect(() => new Aggregation([...trades_0_1_exact_in, ...trades_0_1_exact_out])).toThrow('TRADES_TRADE_TYPE')
  })

  it('has input amount from combined inputs', () => {
    const trades_0_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 2
    })
    expect(new Aggregation(trades_0_1).inputAmount).toEqual(trades_0_1[0].inputAmount.add(trades_0_1[1].inputAmount))
  })

  it('has output amount from combined outputs', () => {
    const trades_0_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 2
    })
    expect(new Aggregation(trades_0_1).outputAmount).toEqual(trades_0_1[0].outputAmount.add(trades_0_1[1].outputAmount))
  })

  it('has the correct price', () => {
    const trades_0_1 = Trade.bestTradeExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token1, {
      maxNumResults: 2
    })
    expect(new Aggregation(trades_0_1).executionPrice).toEqual(
      new Price(token0, token1, JSBI.BigInt(200), JSBI.BigInt(214))
    )
  })

  describe('#bestAggregationExactIn', () => {
    it('throws with 0 pairs', () => {
      expect(() => Aggregation.bestAggregationExactIn([], new TokenAmount(token0, JSBI.BigInt(100)), token2)).toThrow(
        'PAIRS'
      )
    })
    it('throws with 0 maxNumTrades', () => {
      expect(() =>
        Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2, {
          maxNumTrades: 0
        })
      ).toThrow('MAX_NUM_TRADES')
    })
    it('throws with 0 maxHops', () => {
      expect(() =>
        Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2, { maxHops: 0 })
      ).toThrow('MAX_HOPS')
    })
    it('throws for step size range', () => {
      expect(() =>
        Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2, {
          stepSize: new Fraction(JSBI.BigInt(6), JSBI.BigInt(10))
        })
      ).toThrow('STEP_SIZE')
    })
    it('throws for step size divisibility', () => {
      expect(() =>
        Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2, {
          stepSize: new Fraction(JSBI.BigInt(3), JSBI.BigInt(10))
        })
      ).toThrow('STEP_SIZE_EVENLY_DIVISIBLE')
    })

    it('all aggregations', () => {
      const aggs = Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(100)), token2)
      expect(aggs).toHaveLength(3)

      for (let agg of aggs) {
        expect(agg.inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(100)))
        expect(agg.outputAmount.token).toEqual(token2)
        expect(agg.tradeType).toEqual(TradeType.EXACT_INPUT)
      }
    })

    it('best agg combines two routes', () => {
      const aggs = Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(400)), token2)
      expect(aggs).toHaveLength(3)

      const best = aggs[0]
      expect(best.trades).toHaveLength(2)
      expect(best.trades[0].route.path).toEqual([token0, token2]) // mostly direct
      expect(best.trades[0].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(300)))
      expect(best.trades[1].route.path).toEqual([token0, token1, token2]) // indirect via token1
      expect(best.trades[1].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(100)))
    })

    it('respects maxTrades', () => {
      const aggs = Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(400)), token2, {
        maxNumTrades: 1
      })
      expect(aggs).toHaveLength(3)
      expect(aggs.every(aggs => aggs.trades.length === 1)).toEqual(true)
    })

    it('respects maxHops', () => {
      const aggs = Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(400)), token2, {
        maxHops: 1
      })

      // only one direct pair
      expect(aggs).toHaveLength(1)
      expect(aggs.every(aggs => aggs.trades.every(trade => trade.route.pairs.length === 1))).toEqual(true)
    })

    it('respects stepSize', () => {
      const aggs = Aggregation.bestAggregationExactIn(all_pairs, new TokenAmount(token0, JSBI.BigInt(400)), token2, {
        stepSize: new Fraction(JSBI.BigInt(1), JSBI.BigInt(10))
      })

      const best = aggs[0]
      expect(best.trades).toHaveLength(2)
      expect(best.trades[0].route.path).toEqual([token0, token2])
      expect(best.trades[0].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(320))) // mostly direct
      expect(best.trades[1].route.path).toEqual([token0, token1, token2])
      expect(best.trades[1].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(80))) // 0 -> 1 -> 2

      // TODO: fix
      const secondBest = aggs[1]
      expect(secondBest.trades).toHaveLength(2)
      expect(secondBest.trades[0].route.path).toEqual([token0, token2])
      expect(secondBest.trades[0].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(320))) // mostly direct
      expect(secondBest.trades[1].route.path).toEqual([token0, token1, token2])
      expect(secondBest.trades[1].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(80))) // 0 -> 1 -> 2

      const thirdBest = aggs[2]
      expect(thirdBest.trades).toHaveLength(3)
      expect(thirdBest.trades[0].route.path).toEqual([token0, token2])
      expect(thirdBest.trades[0].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(280)))
      expect(thirdBest.trades[1].route.path).toEqual([token0, token1, token2])
      expect(thirdBest.trades[1].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(96)))
      expect(thirdBest.trades[2].route.path).toEqual([token0, token3, token2])
      expect(thirdBest.trades[2].inputAmount).toEqual(new TokenAmount(token0, JSBI.BigInt(24)))
    })
  })
})

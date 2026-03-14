"""
加密货币价格监测工具
使用 CoinGecko 免费 API，支持实时 BTC 价格及多种价格对比（24h 最高/最低、涨跌幅等）
"""

import time
from dataclasses import dataclass
from typing import Optional

import requests

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
DEFAULT_COIN = "bitcoin"
DEFAULT_CURRENCY = "usd"


@dataclass
class PriceSnapshot:
    """单次价格快照与对比数据"""
    coin_id: str
    symbol: str
    name: str
    currency: str
    current: float
    high_24h: float
    low_24h: float
    ath: float
    atl: float
    change_24h: float
    change_pct_24h: float
    last_updated: str

    @property
    def vs_high_24h_amount(self) -> float:
        """当前价相对 24h 最高价：低多少（正数=低于最高）"""
        return self.high_24h - self.current

    @property
    def vs_high_24h_pct(self) -> float:
        """当前价相对 24h 最高价：低百分之几"""
        if self.high_24h <= 0:
            return 0.0
        return (self.vs_high_24h_amount / self.high_24h) * 100

    @property
    def vs_low_24h_amount(self) -> float:
        """当前价相对 24h 最低价：高多少"""
        return self.current - self.low_24h

    @property
    def vs_low_24h_pct(self) -> float:
        """当前价相对 24h 最低价：高百分之几"""
        if self.low_24h <= 0:
            return 0.0
        return (self.vs_low_24h_amount / self.low_24h) * 100

    @property
    def vs_ath_amount(self) -> float:
        """当前价相对历史最高：低多少"""
        return self.ath - self.current

    @property
    def vs_ath_pct(self) -> float:
        """当前价相对历史最高：低百分之几"""
        if self.ath <= 0:
            return 0.0
        return (self.vs_ath_amount / self.ath) * 100

    @property
    def vs_atl_amount(self) -> float:
        """当前价相对历史最低：高多少"""
        return self.current - self.atl

    @property
    def vs_atl_pct(self) -> float:
        """当前价相对历史最低：高百分之几"""
        if self.atl <= 0:
            return 0.0
        return (self.vs_atl_amount / self.atl) * 100

    def to_dict(self) -> dict:
        """导出为字典，便于 JSON API"""
        return {
            "coin_id": self.coin_id,
            "symbol": self.symbol,
            "name": self.name,
            "currency": self.currency,
            "current": self.current,
            "high_24h": self.high_24h,
            "low_24h": self.low_24h,
            "ath": self.ath,
            "atl": self.atl,
            "change_24h": self.change_24h,
            "change_pct_24h": self.change_pct_24h,
            "last_updated": self.last_updated,
            "vs_high_24h_amount": self.vs_high_24h_amount,
            "vs_high_24h_pct": self.vs_high_24h_pct,
            "vs_low_24h_amount": self.vs_low_24h_amount,
            "vs_low_24h_pct": self.vs_low_24h_pct,
            "vs_ath_amount": self.vs_ath_amount,
            "vs_ath_pct": self.vs_ath_pct,
            "vs_atl_amount": self.vs_atl_amount,
            "vs_atl_pct": self.vs_atl_pct,
        }


def fetch_coin_data(coin_id: str = DEFAULT_COIN, vs_currencies: str = DEFAULT_CURRENCY) -> Optional[dict]:
    """从 CoinGecko 获取单币种完整市场数据（含 24h 高低、ATH/ATL）"""
    url = f"{COINGECKO_BASE}/coins/{coin_id}"
    params = {
        "localization": "false",
        "tickers": "false",
        "community_data": "false",
        "developer_data": "false",
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except requests.RequestException as e:
        print(f"请求失败: {e}")
        return None


def parse_snapshot(data: dict, currency: str = DEFAULT_CURRENCY) -> Optional[PriceSnapshot]:
    """从 API 返回的 JSON 解析为 PriceSnapshot"""
    try:
        md = data["market_data"]
        cur = md["current_price"].get(currency) or md["current_price"].get("usd")
        high = md["high_24h"].get(currency) or md["high_24h"].get("usd")
        low = md["low_24h"].get(currency) or md["low_24h"].get("usd")
        ath = md["ath"].get(currency) or md["ath"].get("usd")
        atl = md["atl"].get(currency) or md["atl"].get("usd")
        change_24h = md.get("price_change_24h") or md.get("price_change_24h_in_currency", {}).get(currency) or 0
        change_pct = md.get("price_change_percentage_24h") or md.get("price_change_percentage_24h_in_currency", {}).get(currency) or 0
        if isinstance(change_pct, dict):
            change_pct = change_pct.get(currency, 0)
        last = data.get("last_updated", "")[:19].replace("T", " ")
        return PriceSnapshot(
            coin_id=data.get("id", ""),
            symbol=data.get("symbol", "").upper(),
            name=data.get("name", ""),
            currency=currency.lower(),
            current=float(cur),
            high_24h=float(high),
            low_24h=float(low),
            ath=float(ath),
            atl=float(atl),
            change_24h=float(change_24h),
            change_pct_24h=float(change_pct),
            last_updated=last,
        )
    except (KeyError, TypeError) as e:
        print(f"解析数据失败: {e}")
        return None


def get_snapshot(coin_id: str = DEFAULT_COIN, currency: str = DEFAULT_CURRENCY) -> Optional[PriceSnapshot]:
    """获取一次价格快照（含对比数据）"""
    data = fetch_coin_data(coin_id, currency)
    if not data:
        return None
    return parse_snapshot(data, currency)


def format_price(value: float, currency: str = "usd") -> str:
    if value >= 1:
        return f"{value:,.2f}"
    return f"{value:.6f}"


def print_snapshot(s: PriceSnapshot) -> None:
    """在终端打印一次快照及所有对比"""
    cur_fmt = format_price(s.current, s.currency)
    sep = "─" * 50
    print(f"\n{s.name} ({s.symbol}) — {s.currency.upper()}")
    print(sep)
    print(f"  当前价格:     {cur_fmt}")
    print(f"  24h 最高:     {format_price(s.high_24h, s.currency)}")
    print(f"  24h 最低:     {format_price(s.low_24h, s.currency)}")
    print(sep)
    print("  价格对比（当前价）:")
    print(f"    低于 24h 最高: {format_price(s.vs_high_24h_amount)} ({s.vs_high_24h_pct:.2f}%)")
    print(f"    高于 24h 最低: {format_price(s.vs_low_24h_amount)} ({s.vs_low_24h_pct:.2f}%)")
    print(f"    低于历史最高:  {format_price(s.vs_ath_amount)} ({s.vs_ath_pct:.2f}%)")
    print(f"    高于历史最低:  {format_price(s.vs_atl_amount)} ({s.vs_atl_pct:.2f}%)")
    print(sep)
    sign = "+" if s.change_24h >= 0 else ""
    print(f"  24h 涨跌:     {sign}{format_price(s.change_24h)} ({s.change_pct_24h:+.2f}%)")
    print(f"  数据时间:     {s.last_updated}")
    print()


def run_once(coin_id: str = DEFAULT_COIN, currency: str = DEFAULT_CURRENCY) -> None:
    """拉取并打印一次"""
    s = get_snapshot(coin_id, currency)
    if s:
        print_snapshot(s)


def run_loop(coin_id: str = DEFAULT_COIN, currency: str = DEFAULT_CURRENCY, interval_sec: int = 60) -> None:
    """每隔 interval_sec 秒刷新一次（模拟实时）"""
    print(f"每 {interval_sec} 秒刷新 {coin_id} 价格（Ctrl+C 退出）\n")
    while True:
        run_once(coin_id, currency)
        try:
            time.sleep(interval_sec)
        except KeyboardInterrupt:
            print("\n已退出")
            break


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser(description="加密货币价格监测（BTC 等）")
    p.add_argument("--coin", default=DEFAULT_COIN, help="CoinGecko 币种 id，如 bitcoin")
    p.add_argument("--currency", "-c", default=DEFAULT_CURRENCY, help="计价货币，如 usd, cny")
    p.add_argument("--watch", "-w", action="store_true", help="持续监控，定时刷新")
    p.add_argument("--interval", "-i", type=int, default=60, help="刷新间隔秒数（默认 60）")
    args = p.parse_args()
    if args.watch:
        run_loop(args.coin, args.currency, args.interval)
    else:
        run_once(args.coin, args.currency)

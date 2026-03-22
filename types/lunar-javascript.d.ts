declare module "lunar-javascript" {
  /** 公历；fromYmdHms / getLunar 等与 najia / 农历库一致 */
  export class Solar {
    static fromYmdHms(
      year: number,
      month: number,
      day: number,
      hour: number,
      minute: number,
      second: number
    ): Solar;
    getLunar(): {
      getYearInGanZhi(): string;
      getMonthInGanZhi(): string;
      getDayInGanZhi(): string;
      getTimeInGanZhi(): string;
      getDayGan(): string;
      getDayXunKong(): string;
      getTimeXunKong(): string;
      toString(): string;
      getMonth(): number;
      getDay(): number;
      getEightChar(): { getTime(): string };
    };
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getHour(): number;
    getMinute(): number;
    getSecond(): number;
  }
}

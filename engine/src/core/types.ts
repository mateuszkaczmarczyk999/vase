/**
 * Timestep interface for delta time calculations
 */
export interface Timestep {
  getSeconds(): number;
  getMilliseconds(): number;
}

/**
 * Time class implementation for timestep management
 */
export class Time implements Timestep {
  constructor(private time: number = 0) {}

  getSeconds(): number {
    return this.time;
  }

  getMilliseconds(): number {
    return this.time * 1000;
  }

  /**
   * Set the time value
   * @param time Time in seconds
   */
  setTime(time: number): void {
    this.time = time;
  }

  /**
   * Create a Time instance from milliseconds
   * @param ms Time in milliseconds
   */
  static fromMilliseconds(ms: number): Time {
    return new Time(ms / 1000);
  }

  /**
   * Create a Time instance from seconds
   * @param seconds Time in seconds
   */
  static fromSeconds(seconds: number): Time {
    return new Time(seconds);
  }
}


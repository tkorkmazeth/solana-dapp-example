import { format } from "date-fns";

// Concatenates classes into a single className string
const cn = (...args: string[]) => args.join(" ");

const formatDate = (date: string) =>
  format(new Date(date), "MM/dd/yyyy h:mm:ss");

/**
 * Formats number as currency string.
 *
 * @param number Number to format.
 */
const numberToCurrencyString = (number: number) =>
  number.toLocaleString("en-US");

/**
 * Returns a number whose value is limited to the given range.
 *
 * Example: limit the output of this computation to between 0 and 255
 * (x * 255).clamp(0, 255)
 *
 * @param {Number} min The lower boundary of the output range
 * @param {Number} max The upper boundary of the output range
 * @returns A number in the range [min, max]
 * @type Number
 */
const clamp = (current, min, max) => Math.min(Math.max(current, min), max);

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export { cn, formatDate, numberToCurrencyString, clamp };

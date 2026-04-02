const arabicNumberFormatter = new Intl.NumberFormat("ar-EG-u-nu-arab", {
  maximumFractionDigits: 0,
});

const arabicDecimalFormatter = new Intl.NumberFormat("ar-EG-u-nu-arab", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumberAr(value: number) {
  return arabicNumberFormatter.format(value);
}

export function formatDecimalAr(value: number) {
  return arabicDecimalFormatter.format(value);
}

export function formatEgp(value: number) {
  return `${arabicDecimalFormatter.format(value)} ج.م`;
}

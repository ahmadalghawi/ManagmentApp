// Static baseline conversion rates
// A full app might fetch these from an API, but these provide a realistic baseline.
const BASE_RATES = {
  DKK: 1,
  SEK: 0.65,
  EUR: 7.45,
  USD: 6.90,
  GBP: 8.70
};

export function convertToCurrency(amount, fromCurrency, toCurrency = 'DKK') {
  if (!amount || isNaN(amount)) return 0;
  if (fromCurrency === toCurrency) return amount;
  
  // Convert from origin currency to DKK (our common denominator)
  const fromRate = BASE_RATES[fromCurrency] || 1;
  const inDkk = amount * fromRate;
  
  // Convert from DKK to target currency
  const toRate = BASE_RATES[toCurrency] || 1;
  return inDkk / toRate;
}

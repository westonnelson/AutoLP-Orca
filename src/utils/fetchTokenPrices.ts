export async function fetchTokenPricesJup(
  tokens: string[],
  fetchAll: boolean = false,
  vsToken: string = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" // USDC as default vs token
) {
  tokens = [...new Set(tokens)];
  const tokensString = tokens.join(",");
  const url = `https://price.jup.ag/v6/price?ids=${tokensString}&vsToken=${vsToken}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data) {
      console.error(
        `Jupiter Token Prices: Price Data Undefined. Retrying in 5 seconds... Response: ${response}`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await fetchTokenPricesJup(tokens, fetchAll, vsToken);
    }
    // check that the data has all the tokens asked for
    if (data.data && Object.keys(data.data).length < tokens.length) {
      if (fetchAll) {
        console.log(
          "Jupiter Token Prices: Missing some tokens, fetching again in 5 seconds..."
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await fetchTokenPricesJup(tokens, fetchAll, vsToken);
      }
    }
    return data.data;
  } catch (error) {
    console.error(
      `Jupiter Token Prices: Error, retrying in 5 seconds... ${error}`
    );
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await fetchTokenPricesJup(tokens, fetchAll, vsToken);
  }
}

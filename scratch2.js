const MONDAY_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI';

async function fetchBoardDetails() {
  const query = `query { boards (ids: [5089388529]) { columns { id title type } items_page (limit: 5) { items { id name column_values { id text value } } } } }`;
  
  try {
    const response = await fetch('https://api.monday.com/v2', {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_TOKEN
      },
      body: JSON.stringify({ query })
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

fetchBoardDetails();

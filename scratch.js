const MONDAY_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjYwMTI4NjQwMywiYWFpIjoxMSwidWlkIjo5NzcwMTk5NCwiaWFkIjoiMjAyNS0xMi0yN1QxNTo0NjowNC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MzI1NDUwMjYsInJnbiI6ImV1YzEifQ.DEQcRaY0dumwEXLVoyEimnfgaLtiFbe0q6g40Okc0KI';

async function fetchBoards() {
  const query = `query { boards (limit: 10) { id name state board_folder_id items_count } }`;
  
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

fetchBoards();

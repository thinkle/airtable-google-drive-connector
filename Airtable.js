function listRecords(endpoint, fields) {
  let fieldsStatement = fields
    .map((f) => `fields%5B%5D=${encodeURIComponent(f)}`)
    .join("&");
  let uri = StaffEndpoint + "?" + fieldsStatement;
  console.log("Request", uri);
  let result = JSON.parse(
    UrlFetchApp.fetch(uri, {
      method: "get",
      headers: {
        Authorization: `Bearer ${AirTableKey}`,
      },
    }).getContentText()
  );
  let records = result.records;
  while (result.offset) {
    result = JSON.parse(
      UrlFetchApp.fetch(uri + "&offset=" + result.offset, {
        method: "get",
        headers: {
          Authorization: `Bearer ${AirTableKey}`,
        },
      }).getContentText()
    );
    records = [...records, ...result.records];
  }
  return records;
}

function testList() {
  console.log(listRecords(StaffEndpoint, ["psnOID", "Email"]));
}

function updateRecords(endpoint, records, method = "patch") {
  if (records.length > 10) {
    let i = 0;
    let responses = [];
    while (i < records.length) {
      console.log("Batch starting at", i);
      responses.push(updateRecords(endpoint, records.slice(i, i + 10)));
      i += 10;
    }
    return responses.join("\n");
  }
  let response;
  try {
    response = UrlFetchApp.fetch(endpoint, {
      method,
      contentType: "application/json",
      payload: JSON.stringify({ records, typecast: true }),
      headers: {
        Authorization: `Bearer ${AirTableKey}`,
      },
    });
  } catch (err) {
    console.log("Error with requst for records", records);
    console.log("Error was:", err);
    throw err;
  }
  let responseText = response && response.getContentText();
  console.log("Got response", responseText);
  return responseText;
}

function testFetch() {
  UrlFetchApp.fetch(StaffEndpoint, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      records: [
        {
          fields: {
            Role: "Administrator",
            First: "Test",
            Last: "Testy",
            School: "Innovation Academy Charter Middle School",
          },
        },
      ],
    }),
    headers: {
      Authorization: `Bearer ${AirTableKey}`,
    },
  });
}

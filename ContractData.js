const contractFieldMap = {
  "Parent First": (r) => r["Parent First Name"],
  "Parent Last": (r) => r["Parent Last Name"],
  "Student First": (r) => r["Student First Name"],
  "Student Last": (r) => r["Student Last Name"],
  Date: (r) => r["Timestamp"],
  "Grade Level": (r) => `${r["Student Grade Level"]}`,
  WiFi: (r) => r["Do you have access to wireless internet?"],
  Signature: (r) =>
    r[
      "By typing my name below (parent/guardian name) I verify that I have read and accepted the terms of the IACS Chromebook Users Agreement."
    ],
};

/**
 * Note: unlike the other data which is unidirectional,
 * in this case we will be pushing from Google Sheets to AirTable,
 * then bringing back information.
 *
 * So, the flow goes like this:
 * 1. Form Data flows into google sheets.
 * 2. We push to AirTable and get a record number.
 * 3. In AirTable, we map from the form data to the student ID.
 * 4. We pull back from AirTable the student info, just for completeness sake.
 *
 * Note: step 4 is currently not useful, but it feels like something we should do :)
 *
 */

function readContractGoogleSheet() {
  let ss = SpreadsheetApp.openByUrl(ContractGoogleSheetURL);
  let sheet = ss.getSheetByName(ContractGoogleSheetName);
  let values = sheet.getDataRange().getValues();
  let json = mapValuesToJson(values);
  return json;
}

function getLASIDInfo() {
  let sheetData = readContractGoogleSheet();
  let unmappedData = sheetData.filter((r) => r["AirTableID"] && !r["LASID"]);
  while (unmappedData.length > 50) {
    let batch = unmappedData.slice(0, 50);
    console.log("LASSID UPDATE Doing batch of", batch.length);
    getLASIDInfoForRows(batch);
    unmappedData = unmappedData.slice(50);
  }
  console.log("LASID UPDATE: Last batch...", unmappedData.length);
  getLASIDInfoForRows(unmappedData);
}

function getLASIDInfoForRows(unmappedData) {
  let idStatements = [];
  for (let row of unmappedData) {
    idStatements.push(`{id}=${row.AirTableID}`);
  }
  let filterBy = `or(${idStatements.join(",")})`;
  let results = listRecords(
    ContractEndpoint,
    ["ID", "LASID (from Student)", "Email (from Student)"],
    filterBy
  );
  let sheet = SpreadsheetApp.openByUrl(ContractGoogleSheetURL).getSheetByName(
    ContractGoogleSheetName
  );
  for (let result of results) {
    let fields = result.fields;
    let id = result.fields["ID"];
    let email =
      result.fields["Email (from Student)"] &&
      result.fields["Email (from Student)"][0];
    let lasid =
      result.fields["LASID (from Student)"] &&
      result.fields["LASID (from Student)"][0];
    if (id && lasid) {
      let originalRow = unmappedData.find((r) => r["AirTableID"] == id);
      console.log("original row was", originalRow);
      let lasidCol = originalRow._headers.indexOf("LASID");
      let emailCol = originalRow._headers.indexOf("Email");
      if (lasidCol > -1) {
        // 1-indexed!
        console.log(originalRow._row_offset + 1, lasidCol + 1, lasid);
        sheet
          .getRange(originalRow._row_offset + 1, lasidCol + 1)
          .setValue(lasid);
      }
      if (emailCol > -1) {
        let row = originalRow._row_offset + 1;
        // 1-indexed!
        let range = sheet.getRange(row, emailCol + 1);
        range.setValue(email);
      }
    }
  }
}

function pushNewContracts() {
  let sheetData = readContractGoogleSheet();
  let unpushedData = sheetData.filter((r) => !r["AirTableID"]);
  console.log(`We have ${unpushedData.length} rows to push`);
  let records = [];
  for (let row of unpushedData) {
    let fields = {};
    for (let key in contractFieldMap) {
      fields[key] = contractFieldMap[key](row);
    }
    records.push({ fields });
  }
  let sheet = SpreadsheetApp.openByUrl(ContractGoogleSheetURL).getSheetByName(
    ContractGoogleSheetName
  );
  if (records.length) {
    let results = updateRecords(ContractEndpoint, records, "post");
    console.log("Got result", results);
    for (let recordNum = 0; recordNum < results.records.length; recordNum++) {
      let original = unpushedData[recordNum];
      let result = results.records[recordNum];
      let airtableCol = original._headers.indexOf("AirTableID");
      if (airtableCol == -1) {
        throw "ERROR: No column AirTableID present for putting ID back in";
      }
      // Remember, getRange is 1-indexed?!?!
      let range = sheet.getRange(1 + original._row_offset, 1 + airtableCol);
      range.setValue(result.fields.ID);
    }
  }
}

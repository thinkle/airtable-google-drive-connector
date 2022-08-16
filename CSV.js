function readCsvToJson(fileId) {
  let file = DriveApp.getFileById(fileId);
  let blob = file.getBlob().getDataAsString();
  let csv = Utilities.parseCsv(blob);
  let jsonRows = [];
  let headers = csv[0];
  for (let rn = 1; rn < csv.length; rn++) {
    let row = csv[rn];
    let json = {};
    for (let cn = 0; cn < headers.length; cn++) {
      json[headers[cn]] = row[cn];
    }
    jsonRows.push(json);
  }
  return jsonRows;
}

function mapValuesToJson(values) {
  let headers = values[0];
  let rows = [];
  for (let i = 1; i < values.length; i++) {
    let json = { _row_offset: i, _headers: headers };
    let row = values[i];
    for (let cn = 0; cn < headers.length; cn++) {
      json[headers[cn]] = row[cn];
    }
    rows.push(json);
  }
  return rows;
}

/**
 * StudentData
 *
 * We pull data from our student information system into google drive in the form
 * of a CSV file.
 *
 * The code here allows us to:
 * 1. Make a mapping from our LASID to AirTable row IDs
 * 2. Update existing rows in our Staff table with new data from our SIS.
 * 3. Add new rows to our AirTable Staff table with new data from our SIS.
 * 4. Check on a timer to see if the CSV file containing the latest SIS data is
 *    newer than our last update and do the update conditionally.
 ***/

const LASIDLOOKUP = "LasidLookup";
const LASIDLOOKUPTIME = "LasicTimestamp";
const LASTSUPDATE = "studentUpdate";

function updateIfNeeded() {
  let lastUpdate =
    PropertiesService.getScriptProperties().getProperty(LASTSUPDATE) || 0;
  let fileChange = DriveApp.getFileById(studentCSVID).getLastUpdated().getTime();
  console.log("Last update at ", lastUpdate);
  console.log("File changed at ", fileChange);
  if (fileChange > lastUpdate) {
    console.log("We need to update");
    updateAirtableWithStudents();
    console.log("Udpate complete");
  } else {
    console.log("No need to update);");
  }
}

/* Do the update */
function updateAirtableWithStudents() {
  let lookup = getLasidLookup();
  let data = readStudentCsvData();
  let updates = [];
  let additions = [];
  for (let row of data) {
    let id = lookup[row['relPsnStdOid.stdIDLocal'];
    let fields = {};
    for (let key in fieldMap) {
      fields[key] = fieldMap[key](row);
    }
    let update = { fields };
    if (id) {
      update.id = id;
      updates.push(update);
    } else {
      additions.push(update);
    }
  }
  console.log("Add=>", updateRecords(StudentEndpoint, additions, "post"));
  console.log("Update=>", updateRecords(StudentEndpoint, updates));
  PropertiesService.getScriptProperties().setProperty(
    LASTSUPDATE,
    "" + new Date().getTime()
  );
  console.log("Update complete!");
}

function testUpdate() {
  updateRecords(StudentUpdate, [
    {
      id: "recpzeNbPTEDsEHiz",
      fields: { "Full Name": "PHYLLIS!", Role: "Speech" },
    },
  ]);
}
/* Grab Staff Data from CSV in Google Drive */
function readStaffCsvData() {
  return readCsvToJson(staffCSVID);
}

fieldMap = {
  Email: (r) => r.psnEmail01,
  First: (r) => r.psnNameFirst,
  Last: (r) => r.psnNameLast,
  YOG: (r) => r["relPsnStdOid.stdYog"],
  Advisor: (r) => r["relPsnStdOid.stdHomeroom"], 
  "Full Name": (r) => `${r.psnNameLast}, ${r.psnNameFirst}`,
};

/* Staff Data format: 
{ psnNameFirst: 'Colin',
    psnNameLast: 'Kennedy',
    psnEmail01: 'ckennedy@innovationcharter.org',
    'relPsnStfOid.stfStaffType': 'Custodian',
    'relPsnStfOid.stfDeptCode': 'Admin',
    psnOID: 'PSN0000003g6Nj',
    'relPsnStfOid.relStfSklOid.sklSchoolName': 'Innnovation Academy Charter School District' },
*/

function testStaffData() {
  console.log(readStaffCsvData());
}

/* Get a lookup table to map Aspen PsnOid to Airtable record ID */
function getLasidLookup() {
  const props = PropertiesService.getScriptProperties();
  let lastFetch = Number(props.getProperty(LASIDLOOKUPTIME));
  if (lastFetch) {
    const now = new Date().getTime();
    const elapsed = now - lastFetch;
    console.log("elapsed since last fetch:", elapsed);
    const HOUR = 60 * 60 * 1000;
    if (elapsed < HOUR) {
      console.log("Use cached psnOidLookup");
      return JSON.parse(props.getProperty(LASIDLOOKUP));
    }
  }
  console.log("Create psnOidLookup");
  return getLasidLookupFromAirtable();
}

function testLookup() {
  console.log(getPsnOidLookup());
}

function getLasidLookupFromAirtable() {
  console.log("Go to airtable");
  let airtableRecords = listRecords(StudentEndpoint, ["LASID"]);
  let lookup = {};
  for (let r of airtableRecords) {
    lookup[r.fields.LASID] = r.id;
  }
  PropertiesService.getScriptProperties().setProperty(
    LASIDLOOKUP,
    JSON.stringify(lookup)
  );
  PropertiesService.getScriptProperties().setProperty(
    LASIDLOOKUPTIME,
    "" + new Date().getTime()
  );
  return lookup;
}

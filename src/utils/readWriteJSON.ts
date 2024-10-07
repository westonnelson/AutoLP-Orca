import fsExtra from "fs-extra";
// import path from "path";

const positionsFilePath: string = "./records/positions.json";
const historyFilePath: string = "./records/history.json";

// Read JSON file
export function readJsonFile(file: string): any {
  const filePath = file === "positions" ? positionsFilePath : historyFilePath;
  const data = fsExtra.readFileSync(filePath, "utf-8");
  return JSON.parse(data);
}

// Write JSON file
export function writeJsonFile(data: any, file: string = "positions"): void {
  const filePath = file === "positions" ? positionsFilePath : historyFilePath;
  const jsonData = JSON.stringify(data, null, 2);
  fsExtra.writeFileSync(filePath, jsonData, "utf-8");
}

// Update JSON file
export function updateJsonFile(
  key: string,
  newData: any,
  file: string = "positions"
): void {
  const data = readJsonFile(file);
  if (data[key]) {
    data[key] = { ...data[key], ...newData };
  } else {
    data[key] = newData;
  }
  writeJsonFile(data, file);
}

// Append to JSON file
export function appendJsonFile(
  key: string,
  newData: any,
  file: string = "history"
): void {
  const data = readJsonFile(file);
  if (data[key]) {
    if (Array.isArray(data[key])) {
      data[key].push(newData);
    } else {
      data[key] = [data[key], newData];
    }
  } else {
    data[key] = [newData];
  }
  writeJsonFile(data, file);
}

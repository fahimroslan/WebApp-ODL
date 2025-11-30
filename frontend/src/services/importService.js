function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = event => resolve(event.target.result);
        reader.onerror = () => reject(new Error('Unable to read the file.'));
        reader.readAsArrayBuffer(file);
    });
}

export async function parseWorkbook(inputElement, preferredSheet) {
    const file = inputElement?.files?.[0];
    if (!file) {
        throw new Error('No file selected.');
    }
    if (!window.XLSX) {
        throw new Error('XLSX library is not loaded.');
    }
    const buffer = await readAsArrayBuffer(file);
    const workbook = window.XLSX.read(new Uint8Array(buffer), { type: 'array' });
    let sheetName = workbook.SheetNames[0];
    if (preferredSheet && workbook.SheetNames.includes(preferredSheet)) {
        sheetName = preferredSheet;
    }
    const sheet = workbook.Sheets[sheetName];
    return window.XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

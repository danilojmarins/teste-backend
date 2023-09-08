interface CSVFile {
    [key: string]: string;
}

const CSVtoJSON = (csv: string) => {
    const array = csv.split("\r");

    // Header do CSV
    const keys = array[0].split(',');

    // Linhas do CSV
    const objects = array[1].split('\n');

    const result = [];

    for (let i = 0; i < objects.length; i++) {
        let obj: CSVFile = {};

        if (objects[i]) {
            const values = objects[i].split(',');

            // Transforma cada linha em um objeto
            for (let j in keys) {
                obj[keys[j]] = values[j];
            }

            result.push(obj);
        }
    }
 
    return result;
}

export default CSVtoJSON;
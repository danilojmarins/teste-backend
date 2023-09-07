interface CSVFile {
    [key: string]: string;
}

const CSVtoJSON = (csv: string) => {
    const array = csv.split("\r");

    const keys = array[0].split(',');

    const objects = array[1].split('\n');

    const result = [];

    for (let i = 0; i < objects.length; i++) {
        let obj: CSVFile = {};

        if (objects[i]) {
            const values = objects[i].split(',');

            for (let j in keys) {
                obj[keys[j]] = values[j];
            }

            result.push(obj);
        }
    }
 
    return result;
}

export default CSVtoJSON;
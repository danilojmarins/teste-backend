import { Request, Response } from "express";
import connection from "../../mysql.js";

export interface DataTypes {
    code: number;
    name: string;
    current_price: number;
    new_price: number;
    erro: string | undefined;
}

const Update = async (req: Request, res: Response) => {
    const { data } = req.body;
    const products: DataTypes[] = data;

    for (let i in products) {
        const productCode = products[i].code;
        const newPrice = products[i].new_price;

        const updateQuery = `
            UPDATE
                products
            SET
                products.sales_price = ?
            WHERE
                products.code = ?
            ;
        `;

        await connection.execute(updateQuery, [newPrice, productCode]);
    }

    return res.sendStatus(200);
}

export default Update;
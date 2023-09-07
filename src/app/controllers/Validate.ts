import { Request, Response } from "express";
import CSVtoJSON from "../helpers/CSVtoJSON.js";
import connection from "../../mysql.js";

interface ProductsJSON {
    product_code: string;
    new_price: string;
}

const Validate = async (req: Request, res: Response) => {
    const { csv_string } = req.body;

    const mockcsv = 'product_code,new_price\r\n1010,13.99\n26,10\n16,20';

    const json = CSVtoJSON(mockcsv) as unknown as ProductsJSON[];

    const results = [];

    for (let i in json) {

        const productCode = parseInt(json[i].product_code);
        const newPrice = parseFloat(json[i].new_price);

        const belongsToPackQuery = `
            SELECT
                *
            FROM
                products,
                packs
            WHERE
                products.code = ? AND
                packs.product_id = ?
            ;
        `;

        const isPackQuery = `
            SELECT
                *
            FROM
                packs
            WHERE
                pack_id = ?
            ;
        `;

        const productQuery = `
            SELECT
                *
            FROM
                products
            WHERE
                code = ?
            ;
        `;

        let productIsPack;
        let productBelongsToPack;

        const [resultIsPack]: any = await connection.execute(isPackQuery, [productCode]);
        const [resultBelongsToPack]: any = await connection.execute(belongsToPackQuery, [productCode, productCode]);
        const [result]: any = await connection.execute(productQuery, [productCode]);

        if (resultIsPack[0]) productIsPack = true;
        if (resultBelongsToPack[0]) productBelongsToPack = true;

        if (productIsPack) {
            let erro: string = '';

            const relatedProductsQuery = `
                SELECT
                    *
                FROM
                    products,
                    packs
                WHERE
                    packs.pack_id = ? AND
                    packs.product_id = products.code
                ;
            `;

            const [relatedProducts]: any = await connection.execute(relatedProductsQuery, [productCode]);

            const match = json.filter((value) => {
                return relatedProducts.some((product: any) => {
                    return value.product_code === product.code.toString();
                });
            });

            const unMatch = relatedProducts.filter((product: any) => {
                return match.some((value) => {
                    return value.product_code !== product.code.toString();
                });
            });

            const matchSum = match.reduce((a: any, b: any) => {
                const { qty } = relatedProducts.find((value: any) => {
                    return value.code.toString() === b.product_code
                });

                return a + (b.new_price * qty);
            }, 0);

            const unMatchSum = unMatch.reduce((a: any, b: any) => {
                return a + (b.sales_price * b.qty);
            }, 0);

            const sum = parseFloat(matchSum) + parseFloat(unMatchSum);
            
            if (sum !== newPrice) {
                erro = 'Preço do Pacote e dos Produtos não batem.'    
            }

            if (!match[0]) {
                erro = 'Produtos não atualizados com o Pacote.';
            }

            results.push({
                code: resultIsPack[0].pack_id,
                erro: erro
            });
        }



        else if (productBelongsToPack) {
            let erro: string = '';

            const relatedPackQuery = `
                SELECT
                    *
                FROM
                    packs
                WHERE
                    packs.product_id = ?
                ;
            `;

            const [relatedPack]: any = await connection.execute(relatedPackQuery, [productCode]);

            const match = json.filter((value) => {
                return value.product_code === relatedPack[0].pack_id.toString();
            });

            if (!match[0]) {
                erro = 'Pacote não atualizado com os Produtos.';
            }

            results.push({
                code: resultBelongsToPack[0].code,
                erro: erro
            });
        }


        else {
            let erro = '';

            if (newPrice > result[0].sales_price * 1.10) {
                erro = 'Preço acima do limite.';
            }

            if (newPrice < result[0].sales_price * 0.9) {
                erro = 'Preço abaixo do limite.';
            }

            results.push({
                code: result[0].code,
                erro: erro
            });
        }

    }

    console.log(results);

    return res.sendStatus(200);
}

export default Validate;
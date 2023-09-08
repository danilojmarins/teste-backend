import { Request, Response } from "express";
import CSVtoJSON from "../helpers/CSVtoJSON.js";
import connection from "../../mysql.js";

interface ProductsJSON {
    product_code: string;
    new_price: string;
}

const Validate = async (req: Request, res: Response) => {
    const { csv_string } = req.body;

    //const mockcsv = 'product_code,new_price\r\n1010,9.99\n26,6\n16,20';

    const json = CSVtoJSON(csv_string) as unknown as ProductsJSON[];

    const fields = Object.keys(json[0]);

    const results = [];

    // Verifica estrutura do CSV
    if (fields.length !== 2 || fields[0] !== 'product_code' || fields[1] !== 'new_price') {
        results.push({
            code: 0,
            erro: 'Campos do arquivo CSV não batem.'
        });

        return res.json(results);
    }

    // Iteração em cada Item do CSV
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
                packs,
                products
            WHERE
                pack_id = ? AND
                pack_id = products.code
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
        let normalProduct;

        const [resultIsPack]: any = await connection.execute(isPackQuery, [productCode]);
        const [resultBelongsToPack]: any = await connection.execute(belongsToPackQuery, [productCode, productCode]);
        const [result]: any = await connection.execute(productQuery, [productCode]);

        if (resultIsPack[0]) productIsPack = true;
        if (resultBelongsToPack[0]) productBelongsToPack = true;
        if (result[0]) normalProduct = true;

        // Produto é um Pacote
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

            // Soma dos novos preços
            const matchSum = match.reduce((a: any, b: any) => {
                const { qty } = relatedProducts.find((value: any) => {
                    return value.code.toString() === b.product_code
                });

                return a + (b.new_price * qty);
            }, 0);

            // Soma dos preços dos itens inalterados
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

            if (newPrice > resultIsPack[0].sales_price * 1.10) {
                erro = 'Preço acima do limite.';
            }

            if (newPrice < resultIsPack[0].sales_price * 0.9) {
                erro = 'Preço abaixo do limite.';
            }

            if (newPrice < resultIsPack[0].cost_price) {
                erro = 'Novo preço abaixo do custo.';
            }

            if (isNaN(newPrice)) {
                erro = 'Preço não é um número válido.';
            }

            results.push({
                code: resultIsPack[0].pack_id,
                name: resultIsPack[0].name,
                current_price: parseFloat(resultIsPack[0].sales_price),
                new_price: newPrice,
                erro: erro
            });
        }


        // Produto pertence a um pacote
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

            const packChange = json.filter((value) => {
                return value.product_code === relatedPack[0].pack_id.toString();
            });

            const productsOfPackQuery = `
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

            const [productsOfPack]: any = await connection.execute(productsOfPackQuery, [relatedPack[0].pack_id]);

            const match = json.filter((value) => {
                return productsOfPack.some((product: any) => {
                    return value.product_code === product.code.toString();
                });
            });

            const unMatch = productsOfPack.filter((product: any) => {
                return match.some((value) => {
                    return value.product_code !== product.code.toString();
                });
            });

            // Soma dos novos preços
            const matchSum = match.reduce((a: any, b: any) => {
                const { qty } = productsOfPack.find((value: any) => {
                    return value.code.toString() === b.product_code
                });

                return a + (b.new_price * qty);
            }, 0);

            // Soma dos preços dos produtos inalterados
            const unMatchSum = unMatch.reduce((a: any, b: any) => {
                return a + (b.sales_price * b.qty);
            }, 0);

            const sum = parseFloat(matchSum) + parseFloat(unMatchSum);

            if (sum !== parseFloat(packChange[0].new_price)) {
                erro = 'Preço do Produto e do Pacote não batem.'    
            }

            if (newPrice < resultBelongsToPack[0].cost_price) {
                erro = 'Novo preço abaixo do custo.';
            }

            if (newPrice > resultBelongsToPack[0].sales_price * 1.10) {
                erro = 'Preço acima do limite.';
            }

            if (newPrice < resultBelongsToPack[0].sales_price * 0.9) {
                erro = 'Preço abaixo do limite.';
            }

            if (!packChange[0]) {
                erro = 'Pacote não atualizado com os Produtos.';
            }

            if (isNaN(newPrice)) {
                erro = 'Preço não é um número válido.';
            }

            results.push({
                code: resultBelongsToPack[0].code,
                name: resultBelongsToPack[0].name,
                current_price: parseFloat(resultBelongsToPack[0].sales_price),
                new_price: newPrice,
                erro: erro
            });
        }


        // Produto não é Pacote nem pertence a um Pacote
        else if (normalProduct) {
            let erro = '';

            if (newPrice > result[0].sales_price * 1.10) {
                erro = 'Preço acima do limite.';
            }

            if (newPrice < result[0].sales_price * 0.9) {
                erro = 'Preço abaixo do limite.';
            }

            if (newPrice < result[0].cost_price) {
                erro = 'Novo preço abaixo do custo.';
            }

            if (isNaN(newPrice)) {
                erro = 'Preço não é um número válido.';
            }

            results.push({
                code: result[0].code,
                name: result[0].name,
                current_price: parseFloat(result[0].sales_price),
                new_price: newPrice,
                erro: erro
            });
        }


        // Produto não encontrado
        else {
            let erro = 'Produto não existe.'

            results.push({
                code: productCode,
                erro: erro
            });
        }

    }

    return res.json(results);
}

export default Validate;
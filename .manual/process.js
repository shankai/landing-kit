const yaml = require('js-yaml');
const fs = require('fs');
var request = require('sync-request');
var _ = require('lodash');

let attributes = [];
let categories = [];
let content = "";

function formatThousand(number) {
    let n = number;
    let r = '';
    let temp = '';
    let mod;
    do {
        // 求模的值， 用于获取高三位，这里可能有小数
        mod = n % 1000;
        // 值是不是大于1，是继续的条件
        n = n / 1000;
        // 高三位
        temp = ~~mod;
        // 1.填充: n > 1 循环未结束， 就要填充为比如 1 => 001
        // 不然temp = ~~mod的时候, 1 001， 就会变成 "11"
        // 2.拼接“,”
        r = (n >= 1 ? `${temp}`.padStart(3, '0') : temp) + (!!r ? ',' + r : '');
    } while (n >= 1);
    const strNumber = number + '';
    let index = strNumber.indexOf('.');
    // 拼接小数部分
    if (index >= 0) {
        r += strNumber.substring(index);
    }
    return r;
}

function formatNumber(num, precision = 1) {
    const map = [{
            suffix: 't',
            threshold: 1e12
        },
        {
            suffix: 'b',
            threshold: 1e9
        },
        {
            suffix: 'm',
            threshold: 1e6
        },
        {
            suffix: 'k',
            threshold: 1e3
        },
        {
            suffix: '',
            threshold: 1
        },
    ];

    const found = map.find((x) => Math.abs(num) >= x.threshold);
    if (found) {
        const formatted = (num / found.threshold).toFixed(precision) + found.suffix;
        return formatted;
    }

    return num;
}

function fetch(item) {

    var res = request('GET', `https://api.github.com/repos/${item.name}`, {
        timeout: 5000,
        headers: {
            'User-Agent': 'PostmanRuntime/7.32.3'
        }
    });
    var data = JSON.parse(res.getBody('utf8'));
    generateRecord(data, attributes, item)
}

function generateHeader(cate, attributes) {

    console.log('Header');

    const cateName = cate['name'];
    const cateDesc = "";

    var segment = "\n";
    segment += `## ${cateName}\n`;
    if (cateDesc && cateDesc.length > 0) {
        segment += `> ${cateDesc}\n`;
    }

    if (attributes) {

        console.log(attributes);

        var header = "|";
        var headerDiv = "|";

        attributes.forEach((attr) => {
            const display = attr['display'];
            const align = attr['align'] || '---';
            header += ` ${display} |`;
            headerDiv += `${align}|`
        });

        content += segment + '\n';
        content += header + '\n';
        content += headerDiv + '\n';
    }



}

function generateRecord(record, attributes, item) {

    console.log('Record', record);
    if (record && attributes) {

        let row = "|";

        attributes.forEach((attr) => {

            const keyName = attr['name'];
            const keyLink = attr['link'];
            const type = attr['type'];

            let val = _.get(record, keyName, '');
            let valDisplay = "";
            if ('number' == type) {
                valDisplay = formatThousand(val);

                if (val > 1000) {
                    valDisplay = `${formatNumber(val)}(${valDisplay})`;
                }
            } else if ( 'static' == type ) {
                valDisplay = _.get(item, `static.${keyName}`, '');
            } else {
                valDisplay = val;
            }

            if (keyLink) {
                // link
                const link = _.get(record, keyLink, '');
                row += `[${valDisplay}](${link})|`;
            } else {
                // raw
                row += `${valDisplay}|`;
            }
        });

        content += `${row}\n`;

    }
}

function loadConfig() {
    try {
        const doc = yaml.load(fs.readFileSync('./meta.yaml', 'utf8'));
        // console.log(doc);
        attributes = doc['attributes'];
        categories = doc['categories'];
        console.log("Config", categories[0].items);
    } catch (e) {
        console.log(e);
    }
}

function writeTarget() {

    console.log('write...............');
    fs.writeFileSync("../readme.dev.md", content);
}

function each() {
    let pros = [];

    categories.forEach((cate, index, cates) => {

        generateHeader(cate, attributes);

        // record
        const items = cate['items'];

        if (items) {
            items.forEach((item) => {
                fetch(item);
            })
        }
    });

    return pros;

}

function main() {
    // initial
    loadConfig();

    // each
    each();

    writeTarget();

}

main();
// console.log(formatNumber(1100));
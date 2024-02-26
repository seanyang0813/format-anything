function convertMaskToImageArray(data) {
    // Select best mask
    let { mask, scores } = data;
    let maskArr = mask.data;
    const numMasks = scores.length; // 3
    let bestIndex = 0;
    let numPixels = 0;
    let min_x = null;
    let min_y = null;
    let max_x = null;
    let max_y = null;
    for (let i = 1; i < numMasks; ++i) {
        if (scores[i] > scores[bestIndex]) {
            bestIndex = i;
        }
    }
    for (let i = 0; i < mask.height; i++) {
        for (let j = 0; j < mask.width; j++) {
            if (
                data.mask.data[numMasks * (i * mask.width + j) + bestIndex] ===
                1
            ) {
                numPixels++;
                if (min_x == null || i < min_x) {
                    min_x = i;
                }
                if (min_y == null || j < min_y) {
                    min_y = j;
                }
                if (max_x == null || i > max_x) {
                    max_x = i;
                }
                if (max_y == null || j > max_y) {
                    max_y = j;
                }
            }
        }
    }
    // slice out the grid with max x y z

    // populate the new array
    const image = Array(max_y - min_y + 1)
        .fill()
        .map(() => Array(max_x - min_x + 1).fill(0));

    for (let i = min_x; i <= max_x; i++) {
        for (let j = min_y; j <= max_y; j++) {
            if (
                data.mask.data[numMasks * (i * mask.width + j) + bestIndex] ===
                1
            ) {
                image[j - min_y][i - min_x] = 1;
            }
        }
    }

    return {
        image: image,
        width: max_x - min_x + 1,
        height: max_y - min_y + 1,
        imagePixelCount: numPixels,
    };
}

function splitWithDelimiter(str, delimiter) {
    const regex = new RegExp(`(${delimiter.source})`);
    const parts = str.split(regex).reduce((acc, cur, i, arr) => {
        if (i % 2 === 0) acc.push(cur + (arr[i + 1] || ""));
        return acc;
    }, []);

    return parts;
}

function tokenizeCode(code) {
    let index = 0;
    let tokens = [];
    const canTokenize = /[,\(\)=\+\-\*%^! ]/;
    // tokenize the code line by line
    let code_lines = code.split("\n");
    for (let line of code_lines) {
        for (let token of splitWithDelimiter(line, canTokenize)) {
            tokens.push(token);
        }
    }
    tokens = tokens.filter((x) => x !== " ");
    return tokens;
}

function createStringFitFromArray(arr, leftOverSpaces) {
    if (arr.length === 0) {
        return " ".repeat(leftOverSpaces);
    } else if (arr.length === 1) {
        return arr[0] + " ".repeat(leftOverSpaces);
    } else {
        // padd evenly and left over put at the end
        let numSpaces = Math.floor(leftOverSpaces / (arr.length - 1));
        let remainder = leftOverSpaces % (arr.length - 1);
        return arr.join(" ".repeat(numSpaces)) + " ".repeat(remainder);
    }
}

function greedyFillTextByLine(matrix, codeTokens) {
    let res_arr = [];
    let codeTokenIndex = 0;
    for (let j = 0; j < matrix[0].length; j++) {
        let i = 0;
        let line_res = [];
        while (i < matrix.length) {
            if (matrix[i][j] === 0) {
                line_res.push(" ");
                i++;
            } else {
                // look ahead in matrix to see how much 1 we have
                let k = i + 1;
                while (k < matrix.length && matrix[k][j] === 1) {
                    k++;
                }
                let space_left = k - i;
                i = k;

                let segments = [];
                if (codeTokenIndex >= codeTokens.length) {
                    break;
                }
                // force first token in incase it's one big chunk blocking everything after it causing large space
                if (space_left < codeTokens[codeTokenIndex].length) {
                    line_res.push(codeTokens[codeTokenIndex]);
                    k = i + codeTokens[codeTokenIndex].length;
                    codeTokenIndex++;
                    continue;
                }
                // use the space to fill in the code evenly. If there pad some space in the middle
                while (space_left > 0 && codeTokenIndex < codeTokens.length) {
                    let tokenLength = codeTokens[codeTokenIndex].length;
                    if (space_left >= tokenLength) {
                        segments.push(codeTokens[codeTokenIndex]);
                        space_left -= tokenLength;
                        codeTokenIndex++;
                    } else {
                        break;
                    }
                }
                line_res.push(createStringFitFromArray(segments, space_left));
            }
        }
        res_arr.push(line_res.join(""));
    }
    // we have some left over just try to fill at the bottom if we can just build with length of the matrix
    while (codeTokenIndex < codeTokens.length) {
        if (codeTokens[codeTokenIndex].length > matrix.length) {
            res_arr.push(codeTokens[codeTokenIndex]);
            codeTokenIndex++;
            continue;
        }
        let line_res = [];
        let segments = [];
        let space_left = matrix.length;
        while (
            codeTokenIndex < codeTokens.length &&
            space_left > codeTokens[codeTokenIndex].length
        ) {
            let tokenLength = codeTokens[codeTokenIndex].length;
            if (space_left >= tokenLength) {
                segments.push(codeTokens[codeTokenIndex]);
                space_left -= tokenLength;
                codeTokenIndex++;
            } else {
                break;
            }
        }
        res_arr.push(createStringFitFromArray(segments, space_left));
    }
    return res_arr.join("\n");
}

function buildString(processedImage) {
    let textOutput = "";

    for (let j = 0; j < processedImage[0].length; j++) {
        for (let i = 0; i < processedImage.length; i++) {
            if (processedImage[i][j] === 1) {
                textOutput += "X";
            } else {
                textOutput += " ";
            }
        }
        textOutput += "\n";
    }
    console.log(textOutput);
    return textOutput;
}

// Use Voronoi diagram - nearest neighbor style sampling
export function getProcessedImage(data, code) {
    let codeTokens = tokenizeCode(code);
    let targetWordCount = codeTokens.reduce((acc, cur) => acc + cur.length, 0);
    const { mask, scores } = data;
    // find image and pixel count given the image
    // image, imagePixelCount
    const { image, width, height, imagePixelCount } =
        convertMaskToImageArray(data);
    if (image == null) return null;
    const lengthMultiplier = Math.sqrt(
        parseFloat(targetWordCount) / imagePixelCount
    );
    const numRows = Math.ceil(image.length * lengthMultiplier * 1.4);
    const rowMultiplier = parseFloat(numRows) / image.length;
    // add ratio for scaling
    const numCols = Math.ceil((image[0].length * lengthMultiplier) / 1.4);
    const colMultiplier = parseFloat(numCols) / image[0].length;
    if (!numRows || !numCols) {
        return null;
    }
    let processedImage = Array(numRows)
        .fill()
        .map(() => Array(numCols).fill(0));
    for (let i = 0; i < numRows; i++) {
        for (let j = 0; j < numCols; j++) {
            // Get adjusted coordinates
            let y = (j + 0.5) / colMultiplier;
            let x = (i + 0.5) / rowMultiplier;
            // Nearest coordinates boosted by 0.5
            let nearest = [
                [Math.floor(x + 0.5), Math.floor(y + 0.5)],
                [Math.floor(x + 0.5) + 1, Math.floor(y + 0.5)],
                [Math.floor(x + 0.5), Math.floor(y + 0.5) + 1],
                [Math.floor(x + 0.5) + 1, Math.floor(y + 0.5) + 1],
            ];
            let nearestIndex = 0;
            let currentIndex = 0;
            let minimumDistance = 2; // Will never exceed distance sqrt(2) due to how coordinate is constructed
            // Get distance to each point. Skip the point if out of array bounds
            for (let coordinate of nearest) {
                // Bounds check
                if (
                    coordinate[0] < 1 ||
                    coordinate[0] > image.length ||
                    (coordinate[1] < 1) | (coordinate[1] > image[0].length)
                ) {
                    currentIndex++;
                    continue;
                }
                // Use pythagorus
                let dist = Math.sqrt(
                    (coordinate[0] - 0.5 - x) ** 2 +
                        (coordinate[1] - 0.5 - y) ** 2
                );
                if (dist < minimumDistance) {
                    minimumDistance = dist;
                    nearestIndex = currentIndex;
                }
                currentIndex++;
            }
            // Use the closest pixel as part of the image
            processedImage[i][j] =
                image[nearest[nearestIndex][0] - 1][
                    nearest[nearestIndex][1] - 1
                ];
        }
    }

    buildString(processedImage);
    let textOutput = greedyFillTextByLine(processedImage, codeTokens);
    console.log(textOutput);
    return textOutput;
}

function dotProduct(vecA, vecB) {
    let product = 0;
    for (let i = 0; i < vecA.length; i++) {
        product += vecA[i] * vecB[i];
    }
    return product;
}

function magnitude(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
}

function cosineSimilarity(vecA, vecB) {
    return dotProduct(vecA, vecB) / (magnitude(vecA) * magnitude(vecB));
}

export function classify(inputVector, classes) {
    let bestMatch = { class: null, similarity: -1 };
    for (const className in classes) {
        const classRep = classes[className]; // class representative vector
        const sim = cosineSimilarity(inputVector, classRep);
        if (sim > bestMatch.similarity) bestMatch = { class: className, similarity: sim };
    }
    return bestMatch.class; // Return the class with the highest similarity
}

export function getMostSimilar(inputValue: number[], vectorMap, resultCount: number) {
    const result = [];
    for (const key in vectorMap) {
        const vector = vectorMap[key];
        const similarity = cosineSimilarity(inputValue, vector);
        result.push({ key, similarity });
    }
    result.sort((a, b) => b.similarity - a.similarity);
    return result.slice(0, resultCount);
}

// Define class representatives
const classes = {
    'classA': [1, 0, 0],
    'classB': [0, 1, 0],
    'classC': [0, 0, 1],
};



// Example input vector
const inputVector = [0, 1, 0];

// Classify the input vector
export const classifiedAs = classify(inputVector, classes);

console.log(`Input vector is classified as: ${classifiedAs}`);

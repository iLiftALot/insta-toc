
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};

String.prototype.quotePrune = function () {
    console.log(`INITIAL QUOTE: ${this.toString()}`);
    const quotes = this.match(/"/gm);

    if (!quotes) return this.toString();

    const oddQuotes = quotes.length % 2 !== 0;

    let parsedQuotes = this
        //.replaceAll(/\b""\b/g, '"')
        .replace(/^"{2,}/g, '"')
        .replace(/"{2,}$/g, '"');

    if (oddQuotes) parsedQuotes = parsedQuotes.replaceAll(/""/gm, '"');
    console.log(`NEW QUOTE: ${parsedQuotes}`);
    
    return parsedQuotes;
};

String.prototype.simplifyPath = function() {
    return this.slice(this.lastIndexOf('/') + 1);
}



import { describe, test, expect } from '@jest/globals';
import { testStandardHeadings, testHandleLinks, testHeadingsWithoutFirstLevel, testHeadingsMixed, testHeadingsWithSpecialChars } from "./testingObjects";

function testGetIndentationLevel(headingLevel: number, headingLevelStack: number[]) {
    // Pop from the stack until we find a heading level less than the current
    while (
        headingLevelStack.length > 0 && // Avoid indentation for the first heading
        headingLevel <= headingLevelStack[headingLevelStack.length - 1]
    ) {
        headingLevelStack.pop();
    }
    headingLevelStack.push(headingLevel);

    const currentIndentLevel = headingLevelStack.length - 1;

    return { currentIndentLevel, headingLevelStack };
}

describe('Headings', () => {
    test('Returns indented list with links', () => {
        const md = (() => {
            let testHeadingLevelStack: number[] = [];
            const testHeadings: string[] = [];
            
            testStandardHeadings.forEach((test) => {
                const { currentIndentLevel, headingLevelStack } = testGetIndentationLevel(test.level, testHeadingLevelStack);
                testHeadingLevelStack = headingLevelStack;
                
                const heading = testHandleLinks('testStandardHeadings', test.heading, currentIndentLevel);
                testHeadings.push(heading);
            });

            return testHeadings.join('\n');
        })();

        const expectedMd = `
- [[testStandardHeadings#Title 1 Level 1|Title 1 Level 1]]
    - [[testStandardHeadings#Title 1 Level 2|Title 1 Level 2]]
        - [[testStandardHeadings#Title 1 Level 3|Title 1 Level 3]]
            - [[testStandardHeadings#Title 1 Level 4|Title 1 Level 4]]
                - [[testStandardHeadings#Title 1 Level 5|Title 1 Level 5]]
                    - [[testStandardHeadings#Title 1 Level 6|Title 1 Level 6]]
`.trim();

        expect(md).toEqual(expectedMd);
    });

    test('Returns indented list with links if no first level', () => {
        const md = (() => {
            let testHeadingLevelStack: number[] = [];
            const testHeadings: string[] = [];

            testHeadingsWithoutFirstLevel.forEach((test) => {
                const { currentIndentLevel, headingLevelStack } = testGetIndentationLevel(test.level, testHeadingLevelStack);
                testHeadingLevelStack = headingLevelStack;

                const heading = testHandleLinks('testHeadingsWithoutFirstLevel', test.heading, currentIndentLevel);
                testHeadings.push(heading);
            });

            return testHeadings.join('\n');
        })();
        
        const expectedMd = `
- [[testHeadingsWithoutFirstLevel#Title 1 Level 2|Title 1 Level 2]]
    - [[testHeadingsWithoutFirstLevel#Title 1 Level 3|Title 1 Level 3]]
        - [[testHeadingsWithoutFirstLevel#Title 1 Level 4|Title 1 Level 4]]
            - [[testHeadingsWithoutFirstLevel#Title 1 Level 5|Title 1 Level 5]]
                - [[testHeadingsWithoutFirstLevel#Title 1 Level 6|Title 1 Level 6]]
`.trim();
        
        expect(md).toEqual(expectedMd);
    });

    test('Returns indented list from disorderly headings', () => {
        const md = (() => {
            let testHeadingLevelStack: number[] = [];
            const testHeadings: string[] = [];

            testHeadingsMixed.forEach((test) => {
                const { currentIndentLevel, headingLevelStack } = testGetIndentationLevel(test.level, testHeadingLevelStack);
                testHeadingLevelStack = headingLevelStack;

                const heading = testHandleLinks('testHeadingsMixed', test.heading, currentIndentLevel);
                testHeadings.push(heading);
            });

            return testHeadings.join('\n');
        })();

        const expectedMd = `
- [[testHeadingsMixed#Title 1 Level 4|Title 1 Level 4]]
- [[testHeadingsMixed#Title 1 Level 1|Title 1 Level 1]]
    - [[testHeadingsMixed#Title 1 Level 6|Title 1 Level 6]]
    - [[testHeadingsMixed#Title 1 Level 2|Title 1 Level 2]]
    - [[testHeadingsMixed#Title 2 Level 2|Title 2 Level 2]]
        - [[testHeadingsMixed#Title 1 Level 3|Title 1 Level 3]]
`.trim();

        expect(md).toEqual(expectedMd);
    });


    test('Returns indented list with sanitized links from special chars and HTML', () => {
        const md = (() => {
            let testHeadingLevelStack: number[] = [];
            const testHeadings: string[] = [];

            testHeadingsWithSpecialChars.forEach((test) => {
                const { currentIndentLevel, headingLevelStack } = testGetIndentationLevel(test.level, testHeadingLevelStack);
                testHeadingLevelStack = headingLevelStack;

                const heading = testHandleLinks('testHeadingsWithSpecialChars', test.heading, currentIndentLevel);
                testHeadings.push(heading);
            });

            return testHeadings.join('\n');
        })();

        const expectedMd = `
- [[testHeadingsWithSpecialChars#Title 1 \`level 1\` {with special chars}, **bold**, _italic_, a-tag, ==highlighted== and ~~strikethrough~~ text|Title 1 level 1 with special chars, bold, italic, a-tag, highlighted and strikethrough text]]
    - [[testHeadingsWithSpecialChars#Title 1 level 2 <em style="color: black">with HTML</em>|Title 1 level 2 with HTML]]
        - [[testHeadingsWithSpecialChars#Title 1 level 3 wikilink1 wikilink2 wikitext2 [mdlink](https://mdurl)|Title 1 level 3 wikilink1 wikitext2 mdlink]]
            - [[testHeadingsWithSpecialChars#Title 1 level 4 wikilink1 wikilink2 wikitext2 [mdlink1](https://mdurl) wikilink3 wikilink4 wikitext3 [mdlink2](https://mdurl)|Title 1 level 4 wikilink1 wikitext2 mdlink1 wikilink3 wikitext3 mdlink2]]
`.trim();

        expect(md).toEqual(expectedMd);
    });
});

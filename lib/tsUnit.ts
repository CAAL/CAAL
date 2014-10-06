module tsUnit {
    export class Test {
        private tests: TestDefintion[] = [];
        private testClass: TestClass = new TestClass();
        private testRunLimiter: TestRunLimiter = new TestRunLimiter();

        constructor(...testModules: any[]) {
            for (var i = 0; i < testModules.length; i++) {
                var testModule = testModules[i];
                for (var testClass in testModule) {
                    this.addTestClass(new testModule[testClass](), testClass);
                }
            }
        }

        addTestClass(testClass: TestClass, name: string = 'Tests'): void {
            this.tests.push(new TestDefintion(testClass, name));
        }

        isReservedFunctionName(functionName: string): boolean {
            for (var prop in this.testClass) {
                if (prop === functionName) {
                    return true;
                }
            }
            return false;
        }

        run() {
            var testContext = new TestContext();
            var testResult = new TestResult();

            for (var i = 0; i < this.tests.length; ++i) {
                var testClass = this.tests[i].testClass;
                var testName = this.tests[i].name;

                if (!this.testRunLimiter.isTestsGroupActive(testName)) {
                    continue;
                }

                for (var prop in testClass) {
                    if (!this.isReservedFunctionName(prop) && (typeof testClass[prop] === 'function')) {
                        if (!this.testRunLimiter.isTestActive(prop)) {
                            continue;
                        }

                        if (typeof testClass['setUp'] === 'function') {
                            testClass['setUp']();
                        }
                        try {
                            testClass[prop](testContext);
                            testResult.passes.push(new TestDescription(testName, prop, 'OK'));
                        } catch (err) {
                            testResult.errors.push(new TestDescription(testName, prop, err.toString()));
                        }
                        if (typeof testClass['tearDown'] === 'function') {
                            testClass['tearDown']();
                        }
                    }
                }
            }

            return testResult;
        }

        showResults(target: HTMLElement, result: TestResult) {
            var template = '<article>' +
                '<h1>' + this.getTestResult(result) + '</h1>' +
                '<p>' + this.getTestSummary(result) + '</p>' +
                this.testRunLimiter.getLimitCleaner() +
                '<section id="tsFail">' +
                '<h2>Errors</h2>' +
                '<ul class="bad">' + this.getTestResultList(result.errors) + '</ul>' +
                '</section>' +
                '<section id="tsOkay">' +
                '<h2>Passing Tests</h2>' +
                '<ul class="good">' + this.getTestResultList(result.passes) + '</ul>' +
                '</section>' +
                '</article>' +
                this.testRunLimiter.getLimitCleaner();

            target.innerHTML = template;
        }

        private getTestResult(result: TestResult) {
            return result.errors.length === 0 ? 'Test Passed' : 'Test Failed';
        }

        private getTestSummary(result: TestResult) {
            return 'Total tests: <span id="tsUnitTotalCout">' + (result.passes.length + result.errors.length).toString() + '</span>. ' +
                'Passed tests: <span id="tsUnitPassCount" class="good">' + result.passes.length + '</span>. ' +
                'Failed tests: <span id="tsUnitFailCount" class="bad">' + result.errors.length + '</span>.';
        }

        private getTestResultList(testResults: TestDescription[]) {
            var list = '';
            var group = '';
            var isFirst = true;
            for (var i = 0; i < testResults.length; ++i) {
                var result = testResults[i];
                if (result.testName !== group) {
                    group = result.testName;
                    if (isFirst) {
                        isFirst = false;
                    } else {
                        list += '</li></ul>';
                    }
                    list += '<li>' + this.testRunLimiter.getLimiterForGroup(group) + result.testName + '<ul>';
                }
                var resultClass = (result.message === 'OK') ? 'success' : 'error';
                list += '<li class="' + resultClass + '">' + this.testRunLimiter.getLimiterForTest(group, result.funcName) + result.funcName + '(): ' + this.encodeHtmlEntities(result.message) + '</li>';
            }
            return list + '</ul>';
        }

        private encodeHtmlEntities(input: string) {
            return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
    }

    class TestRunLimiter {
        private groupName = null;
        private testName = null;

        constructor() {
            this.setRefreshOnLinksWithHash();
            this.translateStringIntoTestsLimit(window.location.hash);
        }

        public isTestsGroupActive(groupName: string): boolean {
            if (this.groupName === null) {
                return true;
            }

            return this.groupName === groupName;
        }

        public isTestActive(testName: string): boolean {
            if (this.testName === null) {
                return true;
            }

            return this.testName === testName;
        }

        public getLimiterForTest(groupName: string, testName: string): string {
            return '&nbsp;<a href="#' + groupName + '/' + testName + '\" class="ascii">&#9658;</a>&nbsp;';
        }

        public getLimiterForGroup(groupName: string): string {
            return '&nbsp;<a href="#' + groupName + '" class="ascii">&#9658;</a>&nbsp;';
        }

        public getLimitCleaner(): string {
            return '<p><a href="#">Run all tests <span class="ascii">&#9658;</span></a></p>';
        }

        private areAllTestsActive() {
            return this.testName === null && this.groupName === null;
        }

        private isOneWholeGroupActive() {
            return this.testName === null && this.groupName !== null;
        }

        private isOnlyOneTestActive() {
            return this.testName !== null && this.groupName !== null;
        }

        private setRefreshOnLinksWithHash() {
            var previousHandler = window.onhashchange;

            window.onhashchange = function (ev: Event) {
                window.location.reload();

                if (typeof previousHandler === 'function') {
                    previousHandler(ev);
                }
            };
        }

        private translateStringIntoTestsLimit(value: string) {
            var regex = /^#([_a-zA-Z0-9]+)(\/([_a-zA-Z0-9]+))?$/
            var result = regex.exec(value);

            if (result === null) {
                return;
            }

            if (result.length > 1 && result[1] != null) {
                this.groupName = result[1];
            }

            if (result.length > 3 && result[3] != null) {
                this.testName = result[3];
            }
        }
    }

    export class TestContext {
        setUp() {
        }

        tearDown() {
        }

        areIdentical(expected: any, actual: any, message = ''): void {
            if (expected !== actual) {
                throw this.getError('areIdentical failed when given ' +
                    this.printVariable(expected) + ' and ' + this.printVariable(actual),
                    message);
            }
        }

        areNotIdentical(expected: any, actual: any, message = ''): void {
            if (expected === actual) {
                throw this.getError('areNotIdentical failed when given ' +
                    this.printVariable(expected) + ' and ' + this.printVariable(actual),
                    message);
            }
        }

        areCollectionsIdentical(expected: any[], actual: any[], message = ''): void {
            function resultToString(result: number[]): string {
                var msg = '';

                while (result.length > 0) {
                    msg = '[' + result.pop() + ']' + msg;
                }

                return msg;
            }

            var compareArray = (expected: any[], actual: any[], result: number[]): void => {
                var indexString = '', i;

                if (expected === null) {
                    if (actual !== null) {
                        indexString = resultToString(result);
                        throw this.getError('areCollectionsIdentical failed when array a' +
                            indexString + ' is null and b' +
                            indexString + ' is not null',
                            message);
                    }

                    return; // correct: both are nulls
                } else if (actual === null) {
                    indexString = resultToString(result);
                    throw this.getError('areCollectionsIdentical failed when array a' +
                        indexString + ' is not null and b' +
                        indexString + ' is null',
                        message);
                }

                if (expected.length !== actual.length) {
                    indexString = resultToString(result);
                    throw this.getError('areCollectionsIdentical failed when length of array a' +
                        indexString + ' (length: ' + expected.length + ') is different of length of array b' +
                        indexString + ' (length: ' + actual.length + ')',
                        message);
                }

                for (i = 0; i < expected.length; i++) {
                    if ((expected[i] instanceof Array) && (actual[i] instanceof Array)) {
                        result.push(i);
                        compareArray(expected[i], actual[i], result);
                        result.pop();
                    } else if (expected[i] !== actual[i]) {
                        result.push(i);
                        indexString = resultToString(result);
                        throw this.getError('areCollectionsIdentical failed when element a' +
                            indexString + ' (' + this.printVariable(expected[i]) + ') is different than element b' +
                            indexString + ' (' + this.printVariable(actual[i]) + ')',
                            message);
                    }
                }

                return;
            }

            compareArray(expected, actual, []);
        }

        areCollectionsNotIdentical(expected: any[], actual: any[], message = ''): void {
            try {
                this.areCollectionsIdentical(expected, actual);
            } catch (ex) {
                return;
            }

            throw this.getError('areCollectionsNotIdentical failed when both collections are identical', message);
        }

        isTrue(actual: boolean, message = '') {
            if (!actual) {
                throw this.getError('isTrue failed when given ' + this.printVariable(actual), message);
            }
        }

        isFalse(actual: boolean, message = '') {
            if (actual) {
                throw this.getError('isFalse failed when given ' + this.printVariable(actual), message);
            }
        }

        isTruthy(actual: any, message = '') {
            if (!actual) {
                throw this.getError('isTrue failed when given ' + this.printVariable(actual), message);
            }
        }

        isFalsey(actual: any, message = '') {
            if (actual) {
                throw this.getError('isFalse failed when given ' + this.printVariable(actual), message);
            }
        }

        throws(actual: { (): void; }, message = '') {
            var isThrown = false;
            try {
                actual();
            } catch (ex) {
                isThrown = true;
            }
            if (!isThrown) {
                throw this.getError('did not throw an error', message);
            }
        }

        executesWithin(actual: { (): void }, timeLimit: number, message: string = null): void {
            function getTime() {
                return window.performance.now();
            }

            function timeToString(value: number) {
                return Math.round(value * 100) / 100;
            }

            var startOfExecution = getTime();

            try {
                actual();
            }
            catch (ex) {
                throw this.getError('isExecuteTimeLessThanLimit fails when given code throws an exception: "' + ex + '"', message);
            }

            var executingTime = getTime() - startOfExecution;
            if (executingTime > timeLimit) {
                throw this.getError('isExecuteTimeLessThanLimit fails when execution time of given code (' + timeToString(executingTime) + ' ms) ' +
                    'exceed the given limit(' + timeToString(timeLimit) + ' ms)',
                    message);
            }
        }

        fail(message = '') {
            throw this.getError('fail', message);
        }

        private getError(resultMessage: string, message: string) {
            if (message) {
                return new Error(resultMessage + '. ' + message);
            }

            return new Error(resultMessage);
        }

        private static getNameOfClass(inputClass) {
            // see: http://www.stevefenton.co.uk/Content/Blog/Date/201304/Blog/Obtaining-A-Class-Name-At-Runtime-In-TypeScript/
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec((<any> inputClass).constructor.toString());
            return (results && results.length > 1) ? results[1] : '';
        }

        private printVariable(variable: any) {
            if (variable === null) {
                return '"null"';
            }

            if (typeof variable === 'object') {
                return '{object: ' + TestContext.getNameOfClass(variable) + '}';
            }

            return '{' + (typeof variable) + '} "' + variable + '"';
        }
    }

    export class TestClass extends TestContext {

    }

    export class FakeFunction {
        constructor(public name: string, public delgate: { (...args: any[]): any; }) {
        }
    }

    export class Fake<T> {
        constructor(obj: T) {
            for (var prop in obj) {
                if (typeof obj[prop] === 'function') {
                    this[prop] = function () { };
                } else {
                    this[prop] = null;
                }
            }
        }

        create(): T {
            return <T> <any> this;
        }

        addFunction(name: string, delegate: { (...args: any[]): any; }) {
            this[name] = delegate;
        }

        addProperty(name: string, value: any) {
            this[name] = value;
        }
    }

    class TestDefintion {
        constructor(public testClass: TestClass, public name: string) {
        }
    }

    class TestError implements Error {
        constructor(public name: string, public message: string) {
        }
    }

    export class TestDescription {
        constructor(public testName: string, public funcName: string, public message: string) {
        }
    }

    export class TestResult {
        public passes: TestDescription[] = [];
        public errors: TestDescription[] = [];
    }
}
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var tsUnit;
(function (tsUnit) {
    var Test = (function () {
        function Test() {
            var testModules = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                testModules[_i] = arguments[_i + 0];
            }
            this.tests = [];
            this.testClass = new TestClass();
            this.testRunLimiter = new TestRunLimiter();
            for (var i = 0; i < testModules.length; i++) {
                var testModule = testModules[i];
                for (var testClass in testModule) {
                    this.addTestClass(new testModule[testClass](), testClass);
                }
            }
        }
        Test.prototype.addTestClass = function (testClass, name) {
            if (typeof name === "undefined") { name = 'Tests'; }
            this.tests.push(new TestDefintion(testClass, name));
        };

        Test.prototype.isReservedFunctionName = function (functionName) {
            for (var prop in this.testClass) {
                if (prop === functionName) {
                    return true;
                }
            }
            return false;
        };

        Test.prototype.run = function () {
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
                        try  {
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
        };

        Test.prototype.showResults = function (target, result) {
            var template = '<article>' + '<h1>' + this.getTestResult(result) + '</h1>' + '<p>' + this.getTestSummary(result) + '</p>' + this.testRunLimiter.getLimitCleaner() + '<section id="tsFail">' + '<h2>Errors</h2>' + '<ul class="bad">' + this.getTestResultList(result.errors) + '</ul>' + '</section>' + '<section id="tsOkay">' + '<h2>Passing Tests</h2>' + '<ul class="good">' + this.getTestResultList(result.passes) + '</ul>' + '</section>' + '</article>' + this.testRunLimiter.getLimitCleaner();

            target.innerHTML = template;
        };

        Test.prototype.getTestResult = function (result) {
            return result.errors.length === 0 ? 'Test Passed' : 'Test Failed';
        };

        Test.prototype.getTestSummary = function (result) {
            return 'Total tests: <span id="tsUnitTotalCout">' + (result.passes.length + result.errors.length).toString() + '</span>. ' + 'Passed tests: <span id="tsUnitPassCount" class="good">' + result.passes.length + '</span>. ' + 'Failed tests: <span id="tsUnitFailCount" class="bad">' + result.errors.length + '</span>.';
        };

        Test.prototype.getTestResultList = function (testResults) {
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
        };

        Test.prototype.encodeHtmlEntities = function (input) {
            return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        };
        return Test;
    })();
    tsUnit.Test = Test;

    var TestRunLimiter = (function () {
        function TestRunLimiter() {
            this.groupName = null;
            this.testName = null;
            this.setRefreshOnLinksWithHash();
            this.translateStringIntoTestsLimit(window.location.hash);
        }
        TestRunLimiter.prototype.isTestsGroupActive = function (groupName) {
            if (this.groupName === null) {
                return true;
            }

            return this.groupName === groupName;
        };

        TestRunLimiter.prototype.isTestActive = function (testName) {
            if (this.testName === null) {
                return true;
            }

            return this.testName === testName;
        };

        TestRunLimiter.prototype.getLimiterForTest = function (groupName, testName) {
            return '&nbsp;<a href="#' + groupName + '/' + testName + '\" class="ascii">&#9658;</a>&nbsp;';
        };

        TestRunLimiter.prototype.getLimiterForGroup = function (groupName) {
            return '&nbsp;<a href="#' + groupName + '" class="ascii">&#9658;</a>&nbsp;';
        };

        TestRunLimiter.prototype.getLimitCleaner = function () {
            return '<p><a href="#">Run all tests <span class="ascii">&#9658;</span></a></p>';
        };

        TestRunLimiter.prototype.areAllTestsActive = function () {
            return this.testName === null && this.groupName === null;
        };

        TestRunLimiter.prototype.isOneWholeGroupActive = function () {
            return this.testName === null && this.groupName !== null;
        };

        TestRunLimiter.prototype.isOnlyOneTestActive = function () {
            return this.testName !== null && this.groupName !== null;
        };

        TestRunLimiter.prototype.setRefreshOnLinksWithHash = function () {
            var previousHandler = window.onhashchange;

            window.onhashchange = function (ev) {
                window.location.reload();

                if (typeof previousHandler === 'function') {
                    previousHandler(ev);
                }
            };
        };

        TestRunLimiter.prototype.translateStringIntoTestsLimit = function (value) {
            var regex = /^#([_a-zA-Z0-9]+)(\/([_a-zA-Z0-9]+))?$/;
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
        };
        return TestRunLimiter;
    })();

    var TestContext = (function () {
        function TestContext() {
        }
        TestContext.prototype.setUp = function () {
        };

        TestContext.prototype.tearDown = function () {
        };

        TestContext.prototype.areIdentical = function (expected, actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (expected !== actual) {
                throw this.getError('areIdentical failed when given ' + this.printVariable(expected) + ' and ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.areNotIdentical = function (expected, actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (expected === actual) {
                throw this.getError('areNotIdentical failed when given ' + this.printVariable(expected) + ' and ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.areCollectionsIdentical = function (expected, actual, message) {
            var _this = this;
            if (typeof message === "undefined") { message = ''; }
            function resultToString(result) {
                var msg = '';

                while (result.length > 0) {
                    msg = '[' + result.pop() + ']' + msg;
                }

                return msg;
            }

            var compareArray = function (expected, actual, result) {
                var indexString = '', i;

                if (expected === null) {
                    if (actual !== null) {
                        indexString = resultToString(result);
                        throw _this.getError('areCollectionsIdentical failed when array a' + indexString + ' is null and b' + indexString + ' is not null', message);
                    }

                    return;
                } else if (actual === null) {
                    indexString = resultToString(result);
                    throw _this.getError('areCollectionsIdentical failed when array a' + indexString + ' is not null and b' + indexString + ' is null', message);
                }

                if (expected.length !== actual.length) {
                    indexString = resultToString(result);
                    throw _this.getError('areCollectionsIdentical failed when length of array a' + indexString + ' (length: ' + expected.length + ') is different of length of array b' + indexString + ' (length: ' + actual.length + ')', message);
                }

                for (i = 0; i < expected.length; i++) {
                    if ((expected[i] instanceof Array) && (actual[i] instanceof Array)) {
                        result.push(i);
                        compareArray(expected[i], actual[i], result);
                        result.pop();
                    } else if (expected[i] !== actual[i]) {
                        result.push(i);
                        indexString = resultToString(result);
                        throw _this.getError('areCollectionsIdentical failed when element a' + indexString + ' (' + _this.printVariable(expected[i]) + ') is different than element b' + indexString + ' (' + _this.printVariable(actual[i]) + ')', message);
                    }
                }

                return;
            };

            compareArray(expected, actual, []);
        };

        TestContext.prototype.areCollectionsNotIdentical = function (expected, actual, message) {
            if (typeof message === "undefined") { message = ''; }
            try  {
                this.areCollectionsIdentical(expected, actual);
            } catch (ex) {
                return;
            }

            throw this.getError('areCollectionsNotIdentical failed when both collections are identical', message);
        };

        TestContext.prototype.isTrue = function (actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (!actual) {
                throw this.getError('isTrue failed when given ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.isFalse = function (actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (actual) {
                throw this.getError('isFalse failed when given ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.isTruthy = function (actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (!actual) {
                throw this.getError('isTrue failed when given ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.isFalsey = function (actual, message) {
            if (typeof message === "undefined") { message = ''; }
            if (actual) {
                throw this.getError('isFalse failed when given ' + this.printVariable(actual), message);
            }
        };

        TestContext.prototype.throws = function (actual, message) {
            if (typeof message === "undefined") { message = ''; }
            var isThrown = false;
            try  {
                actual();
            } catch (ex) {
                isThrown = true;
            }
            if (!isThrown) {
                throw this.getError('did not throw an error', message);
            }
        };

        TestContext.prototype.executesWithin = function (actual, timeLimit, message) {
            if (typeof message === "undefined") { message = null; }
            function getTime() {
                return window.performance.now();
            }

            function timeToString(value) {
                return Math.round(value * 100) / 100;
            }

            var startOfExecution = getTime();

            try  {
                actual();
            } catch (ex) {
                throw this.getError('isExecuteTimeLessThanLimit fails when given code throws an exception: "' + ex + '"', message);
            }

            var executingTime = getTime() - startOfExecution;
            if (executingTime > timeLimit) {
                throw this.getError('isExecuteTimeLessThanLimit fails when execution time of given code (' + timeToString(executingTime) + ' ms) ' + 'exceed the given limit(' + timeToString(timeLimit) + ' ms)', message);
            }
        };

        TestContext.prototype.fail = function (message) {
            if (typeof message === "undefined") { message = ''; }
            throw this.getError('fail', message);
        };

        TestContext.prototype.getError = function (resultMessage, message) {
            if (message) {
                return new Error(resultMessage + '. ' + message);
            }

            return new Error(resultMessage);
        };

        TestContext.getNameOfClass = function (inputClass) {
            // see: http://www.stevefenton.co.uk/Content/Blog/Date/201304/Blog/Obtaining-A-Class-Name-At-Runtime-In-TypeScript/
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec(inputClass.constructor.toString());
            return (results && results.length > 1) ? results[1] : '';
        };

        TestContext.prototype.printVariable = function (variable) {
            if (variable === null) {
                return '"null"';
            }

            if (typeof variable === 'object') {
                return '{object: ' + TestContext.getNameOfClass(variable) + '}';
            }

            return '{' + (typeof variable) + '} "' + variable + '"';
        };
        return TestContext;
    })();
    tsUnit.TestContext = TestContext;

    var TestClass = (function (_super) {
        __extends(TestClass, _super);
        function TestClass() {
            _super.apply(this, arguments);
        }
        return TestClass;
    })(TestContext);
    tsUnit.TestClass = TestClass;

    var FakeFunction = (function () {
        function FakeFunction(name, delgate) {
            this.name = name;
            this.delgate = delgate;
        }
        return FakeFunction;
    })();
    tsUnit.FakeFunction = FakeFunction;

    var Fake = (function () {
        function Fake(obj) {
            for (var prop in obj) {
                if (typeof obj[prop] === 'function') {
                    this[prop] = function () {
                    };
                } else {
                    this[prop] = null;
                }
            }
        }
        Fake.prototype.create = function () {
            return this;
        };

        Fake.prototype.addFunction = function (name, delegate) {
            this[name] = delegate;
        };

        Fake.prototype.addProperty = function (name, value) {
            this[name] = value;
        };
        return Fake;
    })();
    tsUnit.Fake = Fake;

    var TestDefintion = (function () {
        function TestDefintion(testClass, name) {
            this.testClass = testClass;
            this.name = name;
        }
        return TestDefintion;
    })();

    var TestError = (function () {
        function TestError(name, message) {
            this.name = name;
            this.message = message;
        }
        return TestError;
    })();

    var TestDescription = (function () {
        function TestDescription(testName, funcName, message) {
            this.testName = testName;
            this.funcName = funcName;
            this.message = message;
        }
        return TestDescription;
    })();
    tsUnit.TestDescription = TestDescription;

    var TestResult = (function () {
        function TestResult() {
            this.passes = [];
            this.errors = [];
        }
        return TestResult;
    })();
    tsUnit.TestResult = TestResult;
})(tsUnit || (tsUnit = {}));

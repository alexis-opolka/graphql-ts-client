"use strict";
/**
 * @author ChenTao
 *
 * 'graphql-ts-client' is a graphql client for TypeScript, it has two functionalities:
 *
 * 1. Supports GraphQL queries with strongly typed code
 *
 * 2. Automatically infers the type of the returned data according to the strongly typed query
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FragmentWrapper = exports.AbstractFetcher = void 0;
const Parameter_1 = require("./Parameter");
const TextWriter_1 = require("./TextWriter");
class AbstractFetcher {
    constructor(ctx, _negative, _field, _args, _child, _optionsValue) {
        this._negative = _negative;
        this._field = _field;
        this._args = _args;
        this._child = _child;
        this._optionsValue = _optionsValue;
        if (Array.isArray(ctx)) {
            this._fetchableType = ctx[0];
            this._unionItemTypes = ctx[1] !== undefined && ctx[1].length !== 0 ? ctx[1] : undefined;
        }
        else {
            this._fetchableType = ctx._fetchableType;
            this._unionItemTypes = ctx._unionItemTypes;
            this._prev = ctx;
        }
    }
    get fetchableType() {
        return this._fetchableType;
    }
    addField(field, args, child, optionsValue) {
        return this.createFetcher(false, field, args, child, optionsValue);
    }
    removeField(field) {
        if (field === '__typename') {
            throw new Error("__typename cannot be removed");
        }
        return this.createFetcher(true, field);
    }
    addEmbbeddable(child, fragmentName) {
        let fieldName;
        if (fragmentName !== undefined) {
            if (fragmentName.length === 0) {
                throw new Error("fragmentName cannot be ''");
            }
            if (fragmentName.startsWith("on ")) {
                throw new Error("fragmentName cannot start with 'on '");
            }
            fieldName = `... ${fragmentName}`;
        }
        else if (child._fetchableType.entityName === this._fetchableType.entityName || child._unionItemTypes !== undefined) {
            fieldName = '...';
        }
        else {
            fieldName = `... on ${child._fetchableType.entityName}`;
        }
        return this.createFetcher(false, fieldName, undefined, child);
    }
    get fieldMap() {
        let m = this._fieldMap;
        if (m === undefined) {
            this._fieldMap = m = this._getFieldMap0();
        }
        return m;
    }
    _getFieldMap0() {
        var _a, _b;
        const fetchers = [];
        for (let fetcher = this; fetcher !== undefined; fetcher = fetcher._prev) {
            if (fetcher._field !== "") {
                fetchers.push(fetcher);
            }
        }
        const fieldMap = new Map();
        for (let i = fetchers.length - 1; i >= 0; --i) {
            const fetcher = fetchers[i];
            if (fetcher._field.startsWith('...')) {
                let childFetchers = (_a = fieldMap.get(fetcher._field)) === null || _a === void 0 ? void 0 : _a.childFetchers;
                if (childFetchers === undefined) {
                    childFetchers = [];
                    fieldMap.set(fetcher._field, { plural: false, childFetchers }); // Fragment cause mutliple child fetchers
                }
                childFetchers.push(fetcher._child);
            }
            else {
                if (fetcher._negative) {
                    fieldMap.delete(fetcher._field);
                }
                else {
                    fieldMap.set(fetcher._field, {
                        argGraphQLTypes: (_b = fetcher.fetchableType.fields.get(fetcher._field)) === null || _b === void 0 ? void 0 : _b.argGraphQLTypeMap,
                        args: fetcher._args,
                        optionsValue: fetcher._optionsValue,
                        plural: fetcher.fetchableType.fields.get(fetcher._field).isPlural,
                        childFetchers: fetcher._child === undefined ? undefined : [fetcher._child] // Association only cause one child fetcher
                    });
                }
            }
        }
        return fieldMap;
    }
    get explicitVariableTypeMap() {
        return this.result.explicitVariableTypeMap;
    }
    get implicitVariableTypeMap() {
        return this.result.implicitVariableTypeMap;
    }
    get implicitVariableValueMap() {
        return this.result.implicitVariableValueMap;
    }
    toString() {
        return this.result.text;
    }
    toFragmentString() {
        return this.result.fragmentText;
    }
    toJSON() {
        return JSON.stringify(this.result);
    }
    get result() {
        let r = this._result;
        if (r === undefined) {
            this._result = r = this.createResult();
        }
        return r;
    }
    createResult() {
        const writer = new TextWriter_1.TextWriter();
        const fragmentWriter = new TextWriter_1.TextWriter();
        let ctx = new ResultContext(writer);
        writer.scope({ type: "BLOCK", multiLines: true, suffix: '\n' }, () => {
            ctx.accept(this);
        });
        const renderedFragmentNames = new Set();
        while (true) {
            const fragmentMap = ctx.namedFragmentMap;
            if (fragmentMap.size === 0) {
                break;
            }
            ctx = new ResultContext(fragmentWriter, ctx);
            for (const [fragmentName, fragment] of fragmentMap) {
                if (renderedFragmentNames.add(fragmentName)) {
                    fragmentWriter.text(`fragment ${fragmentName} on ${fragment.fetchableType.entityName} `);
                    fragmentWriter.scope({ type: "BLOCK", multiLines: true, suffix: '\n' }, () => {
                        ctx.accept(fragment);
                    });
                }
            }
        }
        return {
            text: writer.toString(),
            fragmentText: fragmentWriter.toString(),
            explicitVariableTypeMap: ctx.explicitVariableTypeMap,
            implicitVariableTypeMap: ctx.implicitVariableTypeMap,
            implicitVariableValueMap: ctx.implicitVariableValueMap
        };
    }
    " $supressWarnings"(_, _2) {
        throw new Error("' $supressWarnings' is not supported");
    }
}
exports.AbstractFetcher = AbstractFetcher;
class FragmentWrapper {
    constructor(name, fetcher) {
        this.name = name;
        this.fetcher = fetcher;
    }
}
exports.FragmentWrapper = FragmentWrapper;
class ResultContext {
    constructor(writer = new TextWriter_1.TextWriter(), ctx) {
        var _a, _b, _c;
        this.writer = writer;
        this.namedFragmentMap = new Map();
        this.explicitVariableTypeMap = (_a = ctx === null || ctx === void 0 ? void 0 : ctx.explicitVariableTypeMap) !== null && _a !== void 0 ? _a : new Map();
        this.implicitVariableTypeMap = (_b = ctx === null || ctx === void 0 ? void 0 : ctx.implicitVariableTypeMap) !== null && _b !== void 0 ? _b : new Map();
        this.implicitVariableValueMap = (_c = ctx === null || ctx === void 0 ? void 0 : ctx.implicitVariableValueMap) !== null && _c !== void 0 ? _c : new Map();
    }
    accept(fetcher) {
        var _a, _b;
        const t = this.writer.text.bind(this.writer);
        for (const [fieldName, field] of fetcher.fieldMap) {
            const alias = (_a = field.optionsValue) === null || _a === void 0 ? void 0 : _a.alias;
            if (alias !== undefined && alias !== "" && alias !== fieldName) {
                t(`${alias}: `);
            }
            t(fieldName);
            if (field.args !== undefined) {
                let hasField = false;
                for (const argName in field.args) {
                    const argGraphQLTypeName = (_b = field.argGraphQLTypes) === null || _b === void 0 ? void 0 : _b.get(argName);
                    if (argGraphQLTypeName !== undefined) {
                        hasField = true;
                        break;
                    }
                    else {
                        console.warn(`Unexpected argument: ${argName}`);
                    }
                }
                if (hasField) {
                    this.writer.scope({ type: "ARGUMENTS", multiLines: isMultLineJSON(field.args) }, () => {
                        var _a;
                        for (const argName in field.args) {
                            this.writer.seperator();
                            const arg = field.args[argName];
                            const argGraphQLTypeName = (_a = field.argGraphQLTypes) === null || _a === void 0 ? void 0 : _a.get(argName);
                            if (argGraphQLTypeName !== undefined) {
                                t(argName);
                                t(": ");
                                if (arg instanceof Parameter_1.ParameterRef) {
                                    this.explicitVariableTypeMap.set(arg.name, argGraphQLTypeName);
                                    t(`$${arg.name}`);
                                }
                                else if (arg !== undefined || arg !== null) {
                                    const text = `$__implicitArgs__[${this.implicitVariableTypeMap.size}]`;
                                    t(text);
                                    this.implicitVariableTypeMap.set(text, argGraphQLTypeName);
                                    this.implicitVariableValueMap.set(text, arg);
                                }
                                else {
                                    t("null");
                                }
                            }
                        }
                    });
                }
            }
            const childFetchers = field.childFetchers;
            if (childFetchers !== undefined && childFetchers.length !== 0) {
                if (fieldName.startsWith("...") && !fieldName.startsWith("... on ")) {
                    const fragmentName = fieldName.substring("...".length).trim();
                    const oldFragment = this.namedFragmentMap.get(fragmentName);
                    for (const childFetcher of childFetchers) {
                        if (oldFragment !== undefined && oldFragment !== childFetcher) {
                            throw new Error(`Conflict fragment name ${fragmentName}`);
                        }
                        this.namedFragmentMap.set(fragmentName, childFetcher);
                    }
                }
                else {
                    t(' ');
                    this.writer.scope({ type: "BLOCK", multiLines: true }, () => {
                        for (const childFetcher of childFetchers) {
                            this.accept(childFetcher);
                        }
                    });
                }
            }
            t('\n');
        }
    }
}
function isMultLineJSON(obj) {
    let size = 0;
    if (Array.isArray(obj)) {
        for (const value of obj) {
            if (typeof value === 'object' && !(value instanceof Parameter_1.ParameterRef)) {
                return true;
            }
            if (++size > 2) {
                return true;
            }
        }
    }
    else if (typeof obj === 'object') {
        for (const key in obj) {
            const value = obj[key];
            if (typeof value === 'object' && !(value instanceof Parameter_1.ParameterRef)) {
                return true;
            }
            if (++size > 2) {
                return true;
            }
        }
    }
    return false;
}

export const ind = '    ';
export const ind2 = ind + ind;

export const sig = (return_type, args_description = '') => {
    const args = args_description.trim().split(',')
        .filter(x => x.length > 0)
        .map(x => {
            const [name, type] = x.trim().split(':');
            return {
                name: name.trim(),
                type: type.trim()
            }
        });

    return {
        return_type,
        args
    };
}

export const gen_fn = (name, signature, body, use_result_arg = false) => {
    return `export const ${name}${use_result_arg ? '_r' : ''} = (${signature.args.map(arg => arg.name + ': ' + arg.type).join(', ')}): ${signature.return_type} => {\n${body}\n}`;
};

export const gen_signature = (use_result_arg, base_signature) => {
    if (use_result_arg) {
        return {
            args: [
                {name: 'result', type: base_signature.return_type},
                ...base_signature.args
            ],
            return_type: 'void',
        };
    }
    return base_signature;
}

export const extract_fn_body = (fn) => {
    const full_code = fn.toString();
    const first_curly_index = full_code.indexOf('{');
    const last_curly_index = full_code.lastIndexOf('}');
    return full_code.substring(first_curly_index + 1, last_curly_index).trim();
}

export const optimize_expr = (ast) => {
    if (typeof ast === 'number') return ast;
    if (typeof ast === 'string') return ast;
    switch (ast[0]) {
        case '+': return optimize_add(ast.slice(1).map(optimize_expr));
        case '-': return optimize_sub(ast.slice(1).map(optimize_expr));
        case '*': return optimize_mul(ast.slice(1).map(optimize_expr));
        case '/': return optimize_div(ast.slice(1).map(optimize_expr));
        default: throw new Error(`unknown operator ${ast[0]}`);
    }
}

export const optimize_add = (args) => {
    const symbolic = [];
    let constant = 0;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === 'number') {
            constant += arg;
        } else {
            symbolic.push(arg);
        }
    }

    if (symbolic.length !== 0) {
        return constant !== 0
            ? ['+', ...symbolic, constant]
            : symbolic.length === 1 ? symbolic[0] : ['+', ...symbolic];
    }
    return constant;
}

export const optimize_sub = (args) => {
    if (args.length !== 2) {
        throw new Error(`subtraction operation takes 2 arguments, not ${args.length}`);
    }
    const [a, b] = args;
    if (typeof a === 'number') {
        if (typeof b === 'number') {
            return a - b;
        }
        if (a === 0) {
            return ' - ' + b;
        }
    } else if (b === 0) {
        return a;
    }
    return ['-', a, b];
}

export const optimize_mul = (args) => {
    const symbolic = [];
    let constant = 1;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === 'number') {
            constant *= arg;
        } else {
            symbolic.push(arg);
        }
    }

    if (symbolic.length !== 0) {
        if (constant === 0) {
            return 0;
        }
        if (constant === 1) {
            return symbolic.length === 1 ? symbolic[0] : ['*', ...symbolic]
        }
        return ['*', ...symbolic, constant];
    }
    return constant;
}

export const optimize_div = (args) => {
    if (args.length !== 2) {
        throw new Error(`division operation takes 2 arguments, not ${args.length}`);
    }
    const [a, b] = args;
    if (typeof a === 'number') {
        if (typeof b === 'number') {
            return a / b;
        }
    } else if (b === 1) {
        return a;
    }
    return ['/', a, b];
}

export const gen_output = (use_result_arg, constructor_name, code_per_component, extra_ind = '') => {
    return use_result_arg
        ? code_per_component.map((c, i) => extra_ind + ind + `result[${i}] = ${c};`).join('\n')
        : [
            extra_ind + ind + `return ${constructor_name}(`,
            code_per_component.map(c => extra_ind + ind2 + c).join(',\n'),
            extra_ind + ind + `);`
        ].join('\n')
};

export const gen_expr = (ast) => {
    if (typeof ast === 'number') return ast.toString();
    if (typeof ast === 'string') return ast;
    switch (ast[0]) {
        case '+': return '(' + ast.slice(1).map(gen_expr).join(' + ') + ')';
        case '-': return '(' + ast.slice(1).map(gen_expr).join(' - ') + ')';
        case '*': return '(' + ast.slice(1).map(gen_expr).join(' * ') + ')';
        case '/': return '(' + ast.slice(1).map(gen_expr).join(' / ') + ')';
        default: throw new Error(`unknown operator ${ast[0]}`);
    }
}

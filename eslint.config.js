import globals from "globals";

export default [
    {
        files: ["**/*.js"],
        languageOptions: {
            globals: {
                ...globals.browser
            }
        },
        plugins: {},
        rules: {
            "indent": ["error", 4],
            "linebreak-style": ["error", "unix"],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "no-var": "error",
            "prefer-const": "error",
            "no-multi-assign": "error",
            "eqeqeq": "error",
            "vars-on-top": "error",
            "no-duplicate-imports": "error",
            "no-irregular-whitespace": "error",
            "no-undef": "error",
            //"no-unused-vars": "error",
            "no-undefined": "error"
        }
    }
];

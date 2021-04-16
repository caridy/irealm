import typescript from '@rollup/plugin-typescript';

export default {
    input: ['src/init.ts', 'src/irealm.ts'],
    output: {
        dir: 'lib/',
        format: 'esm'
    },
    plugins: [typescript()]
};

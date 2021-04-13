import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/init.ts',
    output: {
        dir: 'examples/',
        format: 'esm'
    },
    plugins: [typescript()]
};

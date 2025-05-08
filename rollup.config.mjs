import babelPlugin from '@rollup/plugin-babel'
import commonjsPlugin from '@rollup/plugin-commonjs'
import jsonPlugin from '@rollup/plugin-json'
import resolvePlugin from '@rollup/plugin-node-resolve'
import replacePlugin from '@rollup/plugin-replace'
import postcssPlugin from 'rollup-plugin-postcss'
import { isAbsolute, relative, resolve } from 'path'
import { readPackageUp } from 'read-package-up'
import { defineConfig } from 'rollup'
import userscript from 'rollup-plugin-userscript'

const { packageJson } = await readPackageUp()
const extensions = ['.ts', '.tsx', '.mjs', '.js', '.jsx']

export default defineConfig(
  Object.entries({
    'hb-key-exporter': 'src/index.ts',
  }).map(([name, entry]) => ({
    input: entry,
    plugins: [
      postcssPlugin({
        inject: false,
        minimize: true,
      }),
      babelPlugin({
        babelHelpers: 'runtime',
        plugins: [import.meta.resolve('@babel/plugin-transform-runtime')],
        exclude: 'node_modules/**',
        extensions,
      }),
      replacePlugin({
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
        },
        preventAssignment: true,
      }),
      resolvePlugin({ browser: false, extensions }),
      commonjsPlugin(),
      jsonPlugin(),
      userscript((meta) =>
        meta
          .replace('process.env.AUTHOR', packageJson.author.name)
          .replace('process.env.VERSION', packageJson.version)
          .replace('process.env.DESCRIPTION', packageJson.description)
          .replace(
            'process.env.DOWNLOAD_URL',
            process.env.NODE_ENV === 'production' ? packageJson.downloadURL : ''
          )
      ),
    ],
    external: defineExternal([
      'lz-string',
      'datatables.net-dt',
      'solid-js',
      'solid-js/web',
      '@violentmonkey/ui',
      '@violentmonkey/dom',
    ]),
    output: {
      format: 'iife',
      file: `dist/${name}.user.js`,
      globals: {
        'lz-string': 'LZString',
        'datatables.net-dt': 'DataTable',
        'solid-js': 'VM.solid',
        'solid-js/web': 'VM.solid.web',
        '@violentmonkey/dom': 'VM',
        '@violentmonkey/ui': 'VM',
      },
      indent: false,
    },
  }))
)

function defineExternal(externals) {
  return (id) =>
    externals.some((pattern) => {
      if (typeof pattern === 'function') return pattern(id)
      if (pattern && typeof pattern.test === 'function') return pattern.test(id)
      if (isAbsolute(pattern)) return !relative(pattern, resolve(id)).startsWith('..')
      return id === pattern || id.startsWith(pattern + '/')
    })
}

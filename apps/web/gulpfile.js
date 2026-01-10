'use strict';

const gulp = require('gulp');
const fs = require('fs');
const rev = require('gulp-rev');
const replace = require('gulp-replace');
const uglifyJs = require('gulp-terser');
const uglifyCss = require('gulp-clean-css');
const concat = require('gulp-concat');
const del = require('del');
const shell = require('gulp-shell');
const sourcemaps = require('gulp-sourcemaps');
const postcss = require('gulp-postcss');
const postcssNested = require('postcss-nested');

const paths = {
    'manifest': 'public/rev-manifest.json',
    'public': 'public',
    'publicCss': 'public/css',
    'publicJs': 'public/js',
    'srcCss': 'src/css',
    'srcJs': 'src/js',
    'srcViews': 'src/views'
};

const rewriteReferences = () => {
    // My hard-coded solution to rewriting references using a manifest file
    if (!fs.existsSync(paths.manifest)) {
        throw `${paths.manifest} does not exist.  Try running gulp build first.`
    }

    let manifest = JSON.parse(fs.readFileSync(paths.manifest, 'utf8'));

    return gulp.src(`${paths.public}/**/*.html`)
        .pipe(replace(/"((\/css\/styles(-[0-9a-zA-Z]+)?\.min\.css)|(\/js\/scripts(-[0-9a-zA-Z]+)?\.min\.js))"/g, (match) => {
            if (/^"\/css/.test(match)) {
                return `"/css/${manifest["styles.min.css"]}"`;
            }

            return `"/js/${manifest["scripts.min.js"]}"`;
        }))
        .pipe(gulp.dest(paths.public));
};
const minifyJs = () => {
    return gulp.src(`${paths.srcJs}/client-side/*.js`)
        // Create a minified, concatenated JS file
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.min.js'))
        .pipe(uglifyJs())
        // Version our scripts
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.publicJs))
        // Map the styles to their versioned counterparts
        .pipe(rev.manifest(paths.manifest, { base: paths.public, merge: true }))
        .pipe(gulp.dest(paths.public));
};
const minifyCss = () => {
    return gulp.src(`${paths.srcCss}/*.css`)
        // Create a minified, concatenated CSS file
        .pipe(sourcemaps.init())
        .pipe(concat('styles.min.css'))
        // Transform nested CSS to flat CSS before minification
        .pipe(postcss([postcssNested()]))
        .pipe(uglifyCss())
        // Version our CSS
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.publicCss))
        // Map the styles to their versioned counterparts
        .pipe(rev.manifest(paths.manifest, { base: paths.public, merge: true }))
        .pipe(gulp.dest(paths.public));
};
const cleanCss = () => {
    return del([`${paths.publicCss}/*.css`, `${paths.publicCss}/*.css.map`]);
};
const cleanJs = () => {
    // Delete everything but the config.js
    return del([`${paths.publicJs}/*.js`, `${paths.publicJs}/*.js.map`, `!${paths.publicJs}/config.js`]);
};

gulp.task('clean-css', cleanCss);
gulp.task('clean-js', cleanJs);
gulp.task('rewrite-references', rewriteReferences);
gulp.task('minify-js', minifyJs);
gulp.task('minify-css', minifyCss);
gulp.task('build-docs', shell.task('php ../api/aphiria docs:build'));
gulp.task('build-views', shell.task('php ../api/aphiria views:build'));
// We intentionally build our assets first so that they're ready to be inserted into the built views
gulp.task('build', gulp.series('clean-css', 'clean-js', 'minify-js', 'minify-css', 'build-docs', 'build-views', 'rewrite-references'));
gulp.task('watch-assets', () => {
    gulp.watch(`${paths.srcJs}/client-side/*.js`, gulp.series('minify-js', rewriteReferences));
    gulp.watch(`${paths.srcCss}/*.css`, gulp.series('minify-css', rewriteReferences));
    // When our raw views change, we want to also make sure we rewrite their references
    gulp.watch(`${paths.srcViews}/**/*.html`, gulp.series('build-views', rewriteReferences));
});

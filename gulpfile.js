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
const sass = require('gulp-sass')(require('sass'));
const sourcemaps = require('gulp-sourcemaps');

const paths = {
    'manifest': 'public-web/rev-manifest.json',
    'public': 'public-web',
    'publicCss': 'public-web/css',
    'publicJs': 'public-web/js',
    'resourcesCss': 'resources/css',
    'resourcesJs': 'resources/js',
    'resourcesViews': 'resources/views',
    'tmpCss': 'tmp/css',
    'tmpJs': 'tmp/js'
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
    return gulp.src(`${paths.resourcesJs}/*.js`)
        // Create a minified, concatenated JS file
        .pipe(sourcemaps.init())
        .pipe(concat('scripts.min.js'))
        .pipe(gulp.dest(paths.tmpJs))
        .pipe(uglifyJs())
        .pipe(gulp.dest(paths.tmpJs))
        // Version our scripts
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.publicJs))
        // Map the styles to their versioned counterparts
        .pipe(rev.manifest(paths.manifest, { base: paths.public, merge: true }))
        .pipe(gulp.dest(paths.public));
};
const minifyCss = () => {
    // Combine any compiled SCSS files in tmp as well as any other CSS files in resources
    return gulp.src([`${paths.resourcesCss}/*.css`, `${paths.tmpCss}/*.css`])
        // Create a minified, concatenated CSS file
        .pipe(sourcemaps.init())
        .pipe(concat('styles.min.css'))
        .pipe(uglifyCss())
        // Version our scripts
        .pipe(rev())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.publicCss))
        // Map the styles to their versioned counterparts
        .pipe(rev.manifest(paths.manifest, { base: paths.public, merge: true }))
        .pipe(gulp.dest(paths.public));
};
const compileScss = () => {
    return gulp.src(`${paths.resourcesCss}/*.scss`)
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(paths.tmpCss));
};
const cleanCss = () => {
    return del([`${paths.tmpCss}/*.css`, `${paths.publicCss}/*.css`, `${paths.publicCss}/*.css.map`]);
};
const cleanJs = () => {
    // Delete everything but the config.js
    return del([`${paths.tmpJs}/*.js`, `${paths.publicJs}/*.js`, `${paths.publicJs}/*.js.map`, `!${paths.publicJs}/config.js`]);
};

gulp.task('clean-css', cleanCss);
gulp.task('clean-js', cleanJs);
gulp.task('rewrite-references', rewriteReferences);
gulp.task('minify-js', minifyJs);
gulp.task('minify-css', minifyCss);
gulp.task('compile-scss', compileScss);
gulp.task('download-docs', shell.task('php aphiria docs:build'));
gulp.task('build-views', shell.task('php aphiria views:build'));
// We intentionally build our assets first so that they're ready to be inserted into the built views
gulp.task('build', gulp.series('clean-css', 'clean-js', 'compile-scss', 'minify-js', 'minify-css', 'download-docs', 'build-views', 'rewrite-references'));
gulp.task('watch-assets', () => {
    // Purposely deferring rewriting of references to the .css watcher
    gulp.watch(`${paths.resourcesCss}/*.scss`, gulp.series(compileScss));
    gulp.watch(`${paths.resourcesJs}/*.js`, gulp.series('minify-js', rewriteReferences));
    gulp.watch(`${paths.resourcesCss}/*.css`, gulp.series('minify-css', rewriteReferences));
    // When our raw views change, we want to also make sure we rewrite their references
    gulp.watch(`${paths.resourcesViews}/**/*.html`, gulp.series('build-views', rewriteReferences));
});

'use strict';

const gulp = require('gulp');
const rev = require('gulp-rev');
const uglifyJs = require('gulp-terser');
const uglifyCss = require('gulp-clean-css');
const concat = require('gulp-concat');
const revRewrite = require('gulp-rev-rewrite');
const del = require('del');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');
const shell = require('gulp-shell');
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
    const manifest = gulp.src(paths.manifest, { allowEmpty: true });

    // Rewrite references to our scripts using the versioned paths
    return gulp.src(`${paths.public}/**/*.html`)
        .pipe(revRewrite({ manifest }))
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
    return gulp.src(`${paths.resourcesCss}/*.css`)
        // Create a minified, concatenated CSS file
        .pipe(sourcemaps.init())
        .pipe(concat('styles.min.css'))
        .pipe(gulp.dest(paths.tmpCss))
        .pipe(uglifyCss())
        .pipe(gulp.dest(paths.tmpCss))
        // Version our styles
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
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(paths.resourcesCss));
};
const cleanCss = () => {
    return del([`${paths.tmpCss}/*.css`, `${paths.publicCss}/*.css`, `${paths.publicCss}/*.css.map`]);
};
const cleanJs = () => {
    return del([`${paths.tmpJs}/*.js`, `${paths.publicJs}/*.js`, `${paths.publicJs}/*.js.map`]);
};

gulp.task('rewrite-references', rewriteReferences);
gulp.task('minify-js', gulp.series(cleanJs, minifyJs, rewriteReferences));
gulp.task('minify-css', gulp.series(cleanCss, minifyCss, rewriteReferences));
gulp.task('compile-scss', compileScss);
gulp.task('download-docs', shell.task('php aphiria docs:build'));
gulp.task('build-views', gulp.series(shell.task('php aphiria views:build'), rewriteReferences));
gulp.task('build', gulp.series('download-docs', 'build-views', 'compile-scss', 'minify-js', 'minify-css', 'rewrite-references'));
gulp.task('watch-assets', () => {
    gulp.watch(`${paths.resourcesCss}/*.scss`, gulp.series('compile-scss'));
    gulp.watch(`${paths.resourcesJs}/*.js`, gulp.series('minify-js'));
    gulp.watch(`${paths.resourcesCss}/*.css`, gulp.series('minify-css'));
    gulp.watch(`${paths.resourcesViews}/**/*.html`, gulp.series('build-views'));
});

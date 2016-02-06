'use strict';

let isProd = false;
import gulp from 'gulp';
import babelify from 'babelify';
import browserify from 'browserify';
import buffer from 'vinyl-buffer';
import bump from 'gulp-bump';
import del from 'del';
import gutil from 'gulp-util';
import jshint from 'gulp-jshint';
import license from 'gulp-license';
import runSequence from 'run-sequence';
import sass from 'gulp-sass';
import source from 'vinyl-source-stream';
import sourcemaps from 'gulp-sourcemaps';
import uglify from 'gulp-uglify';
import zip from 'gulp-zip';

const scssSourcePath = './src/styles/**/*.scss';
const jsSourcePath = './src/scripts/**/*.js';
const contentScriptEntryPath = './src/scripts/contentScript.js';

gulp.task('jshint', () => {
  return gulp.src([jsSourcePath, './gulpfile.js'])
    .pipe(jshint({
      browser: true,
      curly: true,
      eqeqeq: true,
      eqnull: true,
      esnext: true,
      laxbreak: true,
      laxcomma: true
    }))
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('clean', done => del(['./target'], done));

gulp.task('styles', () => {
  return gulp.src(scssSourcePath)
    .pipe(sass({
      outputStyle: isProd ? 'compressed' : 'expanded'
    }).on('error', sass.logError))
    .pipe(license('MIT', {
      organization: 'Benoit Quenaudon',
      tiny: true
    }))
    .pipe(gulp.dest('./target/styles'));
});

gulp.task('scripts', () => {
  const bundler = browserify(contentScriptEntryPath, {
    debug: !isProd
  }).transform(babelify, {
    presets: ["es2015"]
  });

  let b = bundler.bundle()
    .on('log', gutil.log.bind(gutil, 'Browserify Log'))
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source('cs.js'))
    .pipe(buffer());

  if (isProd) {
    b = b.pipe(uglify().on('error', gutil.log));
  } else {
    b = b.pipe(sourcemaps.init({
        loadMaps: true
      }))
      .pipe(sourcemaps.write('./'));
  }

  return b.pipe(license('MIT', {
    organization: 'Benoit Quenaudon',
    tiny: true
  })).pipe(gulp.dest('./target/scripts'));
});

gulp.task('copy-manifest', () => {
  return gulp.src('./src/manifest.json')
    .pipe(gulp.dest('./target'));
});

gulp.task('build', ['styles', 'scripts', 'copy-manifest'], () => {
  gulp.src('./target/**')
    .pipe(zip('target.zip'))
    .pipe(gulp.dest('./target'));
});

gulp.task('bump', () => {
  gulp.src('./package.json')
    .pipe(bump({
      type: 'patch'
    }))
    .pipe(gulp.dest('./'));

  return gulp.src('./src/manifest.json')
    .pipe(bump({
      type: 'patch'
    }))
    .pipe(gulp.dest('./src'));
});

gulp.task('default', () => {
  return runSequence('clean', ['styles', 'scripts', 'copy-manifest']);
});

gulp.task('prod', () => {
  isProd = true;
  return runSequence('clean', 'bump', 'build');
});

'use strict';

const gulp = require('gulp');
const rimraf = require('gulp-rimraf');
const tslint = require('gulp-tslint');
const shell = require('gulp-shell');
const nodemon = require('gulp-nodemon');

/**
 * Compile TypeScript.
 */

function compileTS(args, cb) {
    return exec(tscCmd + args, (err, stdout, stderr) => {
      console.log(stdout);
  
      if (stderr) {
        console.log(stderr);
      }
      cb(err);
    });
  }
  
  gulp.task('compile', shell.task(['npm run tsc']));

/**
 * Remove build directory.
 */
gulp.task('clean', function() {
  return gulp
    .src('build/*', {
      read: false
    })
    .pipe(rimraf());
});


/**
 * Watch for changes in TypeScript
 */
gulp.task('watch', shell.task(['npm run tsc-watch']));
/**
 * Copy config files
 */
gulp.task('configs', cb => {
  return gulp.src('src/config/*.json').pipe(gulp.dest('./build/src/config'));
});


/**
 * Lint all custom TypeScript files.
 */
gulp.task('tslint', gulp.series('clean', 'compile', 'configs'), () => {
  return gulp
    .src(['src/**/*.ts'])
    .pipe(
      tslint({
        formatter: 'verbose'
      })
    )
    .pipe(tslint.report());
});

/**
 * Build the project.
 */
gulp.task('build', gulp.series('tslint'), () => {
  console.log('Building the project ...');
});

/**
 * Build the project when there are changes in TypeScript files
 */
gulp.task('develop', function() {
  var stream = nodemon({
    script: 'build/src/index.js',
    ext: 'ts',
    tasks: ['build']
  });
  stream
    .on('restart', function() {
      console.log('restarted the build process');
    })
    .on('crash', function() {
      console.error('\nApplication has crashed!\n');
    });
});

gulp.task('default', gulp.series('build'));

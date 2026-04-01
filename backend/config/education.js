const { meta, CATEGORIES } = require('../data/education.json');

const CATEGORY_LIST = Object.values(CATEGORIES);

const ALL_COURSES = {};
for (const category of CATEGORY_LIST) {
  for (const course of category.courses) {
    ALL_COURSES[course.id] = course;
  }
}

module.exports = {
  meta,
  CATEGORIES,
  CATEGORY_LIST,
  ALL_COURSES,
};
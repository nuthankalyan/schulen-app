// User management operations

const User = require('../models/User');

/**
 * Add a new user to the database
 * @param {Object} userData - User data including username and password
 * @returns {Promise<Object>} - The created user object
 */
const addUser = async (userData) => {
  try {
    const user = new User(userData);
    return await user.save();
  } catch (error) {
    throw error;
  }
};

/**
 * Find a user by username
 * @param {string} username - The username to search for
 * @returns {Promise<Object>} - The user object if found
 */
const findUserByUsername = async (username) => {
  try {
    return await User.findOne({ username });
  } catch (error) {
    throw error;
  }
};

module.exports = {
  addUser,
  findUserByUsername
}; 
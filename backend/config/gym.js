const GYMS = require('../data/gym.json');

function getGymById(id){
  return GYMS.find(g => g.id === Number(id));
}

module.exports = { GYMS, getGymById };
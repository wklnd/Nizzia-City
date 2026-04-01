//  Job Controller — City Jobs, Company Jobs

const jobService = require('../services/jobService');

function wrap(fn) {
  return async (req, res) => {
    try { return res.json(await fn(req)); }
    catch (e) { return res.status(e.status || 500).json({ error: e.message }); }
  };
}

const getStatus       = wrap(req => jobService.getJobStatus(req.authUserId));
const listCityJobs    = wrap(() => jobService.listCityJobs());
const getCityJobDetail = wrap(req => jobService.getCityJobDetail(req.params.jobId));
const listCompanies   = wrap(() => jobService.listCompanies());

const hireCityJob = wrap(req => jobService.hireCityJob(req.authUserId, req.body.jobId));
const quitJob     = wrap(req => jobService.quitJob(req.authUserId));
const doWork      = wrap(req => jobService.work(req.authUserId));
const doPromote   = wrap(req => jobService.promote(req.authUserId));
const useAbility  = wrap(req => jobService.useAbility(req.authUserId, Number(req.body.abilityIndex)));

const joinCompany = wrap(req => jobService.joinCompany(req.authUserId, req.body.companyId));

module.exports = {
  getStatus,
  listCityJobs,
  getCityJobDetail,
  listCompanies,
  hireCityJob,
  quitJob,
  doWork,
  doPromote,
  useAbility,
  joinCompany,
};
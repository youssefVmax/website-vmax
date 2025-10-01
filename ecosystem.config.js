module.exports = {
  apps: [{
    name: "vmax",
    script: "npm",
    args: "start",
    cwd: "/var/www/vmax"
  }],

  deploy: {
    production: {
      user: "root",
      host: "168.231.116.87",
      ref: "origin/master",
      repo: "git@github.com:youssefVmax/website-vmax.git",
      path: "/var/www/vmax",
      "post-deploy": "npm install && pm2 reload ecosystem.config.js --env production"
    }
  }
};


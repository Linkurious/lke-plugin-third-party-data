@Library('linkurious-shared')_

nodeJob {
  // General
  projectName = "linkurious/lke-plugin-third-party-data"
  podTemplateNames = ['jnlp-agent-node']

  runUnitTests = false
  runE2eTests = false
  runDependencyVersionCheck = false

  createGitTag = true
  gitTagPrefix = 'v'
  runBookeeping = true

  //static asset upload
  runPrivateNpmPublish = false
  binaries = ["lke-plugin-third-party-data.lke"]
  groupId = 'com.linkurious.plugins'

  githubRelease = true

}

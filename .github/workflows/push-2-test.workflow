workflow "Test workflow" {
  on = "push"
  resolves = ["Jest"]
}

action "Jest" {
  uses = "greenido/jest-action@master"
  args = "**.test.js --ci"
  env = {
    WORKSPACE = "ido-green/tests/"
  }
}

workflow "Test workflow" {
  on = "push"
  resolves = ["Jest"]
}

action "Jest" {
  uses = "stefanoeb/jest-action@master"
  args = "**.test.js --ci"
}

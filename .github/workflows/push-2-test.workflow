workflow "New testing day" {
  resolves = ["Jest"]
  on = "push"
}

action "Jest" {
  uses = "stefanoeb/jest-action@master"
}

// 这是一个示例审计输入
// 复制粘贴为代码/设计输出即可测试审计模式

// ❌ 有问题的输出示例
`<Card title="用户信息" bordered={true}>
  <PrimaryButton type="primary" size="md" color="#FF0000" onClick={handleClick}>
    确定
  </PrimaryButton>
  <SecondaryButton type="text" size="md" onClick={handleCancel}>
    取消
  </SecondaryButton>
</Card>`

// ✅ 正确的输出示例
`<Card title="用户信息" bordered>
  <Button type="primary" size="md" onClick={handleClick}>
    确定
  </Button>
  <Button type="text" size="md" onClick={handleCancel}>
    取消
  </Button>
</Card>`

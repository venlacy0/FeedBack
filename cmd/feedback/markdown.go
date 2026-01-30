package main

import (
	"bytes"
	"html/template"

	"github.com/microcosm-cc/bluemonday"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/extension"
	"github.com/yuin/goldmark/renderer/html"
)

var md = goldmark.New(
	goldmark.WithExtensions(extension.GFM),
	goldmark.WithRendererOptions(html.WithUnsafe()), // 先渲染，后统一 sanitize
)

var sanitize = bluemonday.UGCPolicy()

func renderMarkdown(s string) template.HTML {
	var buf bytes.Buffer
	_ = md.Convert([]byte(s), &buf)
	return template.HTML(sanitize.SanitizeBytes(buf.Bytes()))
}


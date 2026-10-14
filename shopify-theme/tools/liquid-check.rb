# ruby tools/liquid-check.rb — parses every .liquid file in theme/ with Ruby Liquid (the parser Shopify runs on upload),
# with Shopify's theme tags registered, and lists files that fail. theme-check is more lenient than this.
require 'liquid'

class RawBlock < Liquid::Raw; end
class ThemeBlock < Liquid::Block; end
class ThemeTag < Liquid::Tag; end
%w[schema javascript stylesheet].each { |t| Liquid::Environment.default.register_tag(t, RawBlock) }
%w[form paginate style].each { |t| Liquid::Environment.default.register_tag(t, ThemeBlock) }
%w[section sections layout content_for].each { |t| Liquid::Environment.default.register_tag(t, ThemeTag) }

root = File.expand_path('../theme', __dir__)
bad = 0
Dir.glob(File.join(root, '**/*.liquid')).sort.each do |f|
  # {% render block %} is Shopify's own syntax for app blocks; stock Liquid wants a quoted name
  src = File.read(f, encoding: 'UTF-8').gsub(/\{%-?\s*render\s+block\s*-?%\}/, "{% render 'block' %}")
  %i[lax strict].each do |mode|
    begin
      Liquid::Template.parse(src, error_mode: mode, line_numbers: true)
    rescue Liquid::Error => e
      bad += 1 if mode == :lax
      puts "#{mode.to_s.upcase.ljust(6)} #{f.sub(root + '/', '')}: #{e.message}"
    end
  end
end
puts "#{bad} file(s) fail the lax parse"
exit(bad.positive? ? 1 : 0)

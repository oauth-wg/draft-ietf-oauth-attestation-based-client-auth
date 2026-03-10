LIBDIR := lib
include $(LIBDIR)/main.mk

.PHONY: generate-examples
generate-examples:
	@node regenerate-examples.js

draft-ietf-oauth-attestation-based-client-auth.xml: generate-examples

$(LIBDIR)/main.mk:
ifneq (,$(shell grep "path *= *$(LIBDIR)" .gitmodules 2>/dev/null))
	git submodule sync
	git submodule update --init
else
ifneq (,$(wildcard $(ID_TEMPLATE_HOME)))
	ln -s "$(ID_TEMPLATE_HOME)" $(LIBDIR)
else
	git clone -q --depth 10 -b main \
	    https://github.com/martinthomson/i-d-template $(LIBDIR)
endif
endif
